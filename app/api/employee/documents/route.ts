import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeIdParams = url.searchParams.get('userId');

    if (isMockMode()) {
      const targetUserId = employeeIdParams || 'mock';
      const documents = (MockDB.documents || []).filter(
        (d: any) => d.user_id === targetUserId || d.employee_id === targetUserId
      );
      return NextResponse.json({ success: true, data: documents });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    let targetUserId = user.id;

    if (employeeIdParams && employeeIdParams !== user.id) {
       const { data: myUser } = await supabase.from('users').select('role').eq('id', user.id).single();
       if (myUser?.role === 'ADMIN' || myUser?.role === 'super_admin') {
          targetUserId = employeeIdParams;
       } else {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
       }
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isFormData = req.headers.get('content-type')?.includes('multipart/form-data');
    let body: any;
    let userId: string;
    let type: string;
    let name: string;
    let fileUrl: string;

    if (isFormData) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      userId = (formData.get('userId') as string) || 'mock';
      type = (formData.get('type') as string) || 'Other';
      name = file?.name || 'document';
      fileUrl = file ? `mock://${file.name}` : '';
    } else {
      body = await req.json();
      userId = body.user_id || body.userId || 'mock';
      type = body.type;
      name = body.name;
      fileUrl = body.file_url;
    }

    if (!type || !name || !fileUrl) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (isMockMode()) {
      const now = new Date().toISOString();
      const newDoc = {
        id: `doc-${Date.now()}`,
        user_id: userId,
        employee_id: userId,
        document_type: type,
        document_name: name,
        file_url: fileUrl,
        is_verified: false,
        created_at: now,
      };
      MockDB.documents = MockDB.documents || [];
      MockDB.documents.push(newDoc as any);
      saveMockDB();

      MockDB.approvals = MockDB.approvals || [];
      MockDB.approvals.push({
        id: `app-${Date.now()}`,
        type: 'DOCUMENT',
        requester_id: userId,
        approver_id: null,
        data_payload: { documentId: newDoc.id, type, name },
        status: 'PENDING',
        comments: '',
        created_at: now,
      } as any);
      saveMockDB();

      return NextResponse.json({ success: true, data: newDoc });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert([{
         user_id: user.id,
         document_type: type,
         document_name: name,
         file_url: fileUrl,
         is_verified: false
      }]).select().single();

    if (docError) throw docError;

    // Send for approval
    await supabase.from('approvals').insert([{
       type: 'DOCUMENT',
       requester_id: user.id,
       data_payload: { documentId: newDoc.id, type, name },
       status: 'PENDING'
    }]);

    return NextResponse.json({ success: true, data: newDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
