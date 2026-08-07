import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!dbUser || !['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(dbUser.role?.toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: requests, error } = await supabase
      .from('access_requests')
      .select('*, requester:users!access_requests_requester_id_fkey(email, full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!dbUser || !['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(dbUser.role?.toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { request_id, status } = body;
    
    if (!request_id || !status) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get the request details
    const { data: requestRecord, error: fetchError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !requestRecord) throw fetchError || new Error("Request not found");

    let expires_at = null;
    if (status === 'APPROVED' && requestRecord.duration_hours) {
       const d = new Date();
       d.setHours(d.getHours() + requestRecord.duration_hours);
       expires_at = d.toISOString();
       
       // Grant the permission
       await supabase.from('user_permissions').insert([{
           user_id: requestRecord.requester_id,
           permission: requestRecord.module,
           granted_by: user.id,
           expires_at: expires_at
       }]);
    }

    const { data: updatedRequest, error } = await supabase
      .from('access_requests')
      .update({
         status,
         approved_by: user.id,
         expires_at: expires_at
      })
      .eq('id', request_id)
      .select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updatedRequest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
