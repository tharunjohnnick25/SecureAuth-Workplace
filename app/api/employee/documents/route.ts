import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeIdParams = url.searchParams.get('userId');

    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    let targetUserId = session.user.id;

    if (employeeIdParams && employeeIdParams !== session.user.id) {
       const { data: myUser } = await supabase.from('users').select('role, company_id').eq('id', session.user.id).single();
       if (myUser?.role === 'ADMIN' || myUser?.role === 'SUPER_ADMIN') {
           targetUserId = employeeIdParams;
           if (myUser.company_id) {
               const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', targetUserId).single();
               if (targetUser?.company_id !== myUser.company_id) {
                   return NextResponse.json({ success: false, error: 'Forbidden: Different organization' }, { status: 403 });
               }
           }
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
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const isFormData = req.headers.get('content-type')?.includes('multipart/form-data');
    let body: any;
    let type: string;
    let name: string;
    let fileUrl: string;

    if (isFormData) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      type = (formData.get('type') as string) || 'Other';
      name = file?.name || 'document';
      fileUrl = file ? `mock://${file.name}` : '';
    } else {
      body = await req.json();
      type = body.type;
      name = body.name;
      fileUrl = body.file_url;
    }

    if (!type || !name || !fileUrl) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert([{
         user_id: session.user.id,
         document_type: type,
         document_name: name,
         file_url: fileUrl,
         is_verified: false
      }]).select().single();

    if (docError) throw docError;

    // Send for approval
    await supabase.from('approvals').insert([{
       type: 'DOCUMENT',
       requester_id: session.user.id,
       data_payload: { documentId: newDoc.id, type, name },
       status: 'PENDING'
    }]);

    return NextResponse.json({ success: true, data: newDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
