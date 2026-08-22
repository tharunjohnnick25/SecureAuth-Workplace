export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('user_id') || session.user.id;
    console.log('GET /api/drive/files -> targetUserId:', targetUserId, 'session.user.id:', session.user.id);

    // RBAC logic
    if (targetUserId !== session.user.id) {
       const { data: currentUser } = await adminClient.from('users').select('role, company_id').eq('id', session.user.id).single();
       if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
           return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
       }
       if (currentUser.company_id) {
           const { data: targetUser } = await adminClient.from('users').select('company_id').eq('id', targetUserId).single();
           if (targetUser?.company_id !== currentUser.company_id) {
               return NextResponse.json({ success: false, error: 'Forbidden: Different organization' }, { status: 403 });
           }
       }
    }

    const { data: files, error } = await adminClient
      .from('documents')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) throw error;

    const mappedFiles = (files || []).map(f => ({
      ...f,
      owner_id: f.user_id,
      size: f.file_size,
      folder: 'General', // default folder for UI mapping
      is_confidential: false
    }));

    return NextResponse.json({ data: mappedFiles, success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check mock auth bypass
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    if (!session && !isMock) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileSize, mimeType, fileUrl, isConfidential } = body;
    let userId = body.user_id;

    if (!isMock) userId = session!.user.id;

    if (!fileName || !fileUrl) {
      return NextResponse.json({ success: false, error: 'Missing required file data' }, { status: 400 });
    }

    if (!isMock) {
      // Save metadata to Postgres (Upload was handled directly by the frontend)
      const { data: newFile, error: dbError } = await adminClient
        .from('documents')
        .insert({
           user_id: userId,
           document_name: fileName,
           name: fileName,
           file_size: fileSize,
           mime_type: mimeType || 'application/octet-stream',
           file_url: fileUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return NextResponse.json({ data: { ...newFile, owner_id: newFile.user_id, folder: 'General', is_confidential: isConfidential }, success: true }, { status: 201 });
    } else {
      // Mock Auth Fallback
      const newFile = {
        id: `doc_${Date.now()}`,
        user_id: userId,
        name: fileName,
        size: fileSize,
        mime_type: mimeType,
        owner_id: userId,
        folder: 'General',
        is_confidential: isConfidential
      };
      return NextResponse.json({ data: newFile, success: true }, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

