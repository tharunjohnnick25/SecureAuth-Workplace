import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return new NextResponse('Missing fileId', { status: 400 });
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

    // If Mock Auth, we don't have real files in storage to download
    if (isMock) {
      // Just return a dummy text file to simulate download success
      return new NextResponse('Mock file content. Real downloads require backend auth.', {
        headers: {
          'Content-Disposition': `attachment; filename="mock_file.txt"`,
          'Content-Type': 'text/plain',
        },
      });
    }

    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Fetch file metadata
    const { data: file, error: fileError } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // 2. Enforce RBAC
    let hasAccess = false;
    
    // Owner always has access
    if (file.user_id === session.user.id) {
      hasAccess = true;
    } else {
      // Check if current user is admin
      const { data: currentUser } = await adminClient.from('users').select('role, company_id').eq('id', session.user.id).single();
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
      
      if (isAdmin) {
        // Admins have access, but check org isolation
        if (currentUser.company_id) {
          const { data: fileOwner } = await adminClient.from('users').select('company_id').eq('id', file.user_id).single();
          if (fileOwner?.company_id === currentUser.company_id) {
            hasAccess = true;
          }
        } else {
          hasAccess = true;
        }
      } else {
        // Not owner, not admin. Check if file is non-confidential or if they have an approved request
        if (!file.is_confidential) {
          hasAccess = true; // Wait, actually the original workspace UI says:
          // hasAccess = user?.role === 'ADMIN' || !file.is_confidential || requests.some(...)
        } else {
          // Check access requests table (if exists) or just rely on the UI's check.
          // Since the UI checks `!file.is_confidential`, we allow non-confidential.
        }
      }
    }

    if (!hasAccess) {
      return new NextResponse('Forbidden: You do not have permission to download this file', { status: 403 });
    }

    if (!file.file_url || file.file_url === 'mock_url') {
      return new NextResponse('File data missing or is a mock file', { status: 404 });
    }

    // 3. Generate Signed URL
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from('employee-documents')
      .createSignedUrl(file.file_url, 60, {
        download: true, // Forces download
      });

    if (signedUrlError) {
      console.error("Signed URL Error:", signedUrlError);
      return new NextResponse('Error generating secure download link', { status: 500 });
    }

    // 4. Redirect browser to the secure signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);

  } catch (error: any) {
    console.error("Download route error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
