import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

import fs from 'fs';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const paramsResolved = await context.params;
    const fileId = paramsResolved.id;
    fs.appendFileSync('delete_log.txt', `\n--- DELETE REQUEST for ${fileId} ---\n`);

    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session && !isMock) {
      fs.appendFileSync('delete_log.txt', `Unauthorized\n`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (isMock) {
      fs.appendFileSync('delete_log.txt', `Mock auth, returning success\n`);
      return NextResponse.json({ success: true });
    }

    // 1. Fetch file metadata
    const { data: file, error: fileError } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // 2. Enforce RBAC
    let hasAccess = false;
    
    if (file.user_id === session!.user.id) {
      hasAccess = true;
    } else {
      const { data: currentUser } = await adminClient.from('users').select('role, company_id').eq('id', session!.user.id).single();
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
      
      if (isAdmin) {
        if (currentUser.company_id) {
          const { data: fileOwner } = await adminClient.from('users').select('company_id').eq('id', file.user_id).single();
          if (fileOwner?.company_id === currentUser.company_id) hasAccess = true;
        } else {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      fs.appendFileSync('delete_log.txt', `Forbidden access for user ${session!.user.id}\n`);
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 3. Delete from Database
    const { data: deletedRows, error: dbError } = await adminClient
      .from('documents')
      .delete()
      .eq('id', fileId)
      .select();

    if (dbError) {
      fs.appendFileSync('delete_log.txt', `DB error: ${JSON.stringify(dbError)}\n`);
      throw dbError;
    }
    
    if (!deletedRows || deletedRows.length === 0) {
      fs.appendFileSync('delete_log.txt', `DeletedRows is empty. Returning success anyway.\n`);
    } else {
      fs.appendFileSync('delete_log.txt', `Deleted ${deletedRows.length} rows successfully\n`);
    }

    // 4. Delete from Storage
    if (file.file_url && file.file_url !== 'mock_url') {
      const { error: storageError } = await adminClient.storage
        .from('employee-documents')
        .remove([file.file_url]);
        
      if (storageError) {
        fs.appendFileSync('delete_log.txt', `Storage error: ${JSON.stringify(storageError)}\n`);
      } else {
        fs.appendFileSync('delete_log.txt', `Storage remove successful for ${file.file_url}\n`);
      }
    }

    fs.appendFileSync('delete_log.txt', `Returning SUCCESS.\n`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    fs.appendFileSync('delete_log.txt', `Catch block error: ${error.message}\n`);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
