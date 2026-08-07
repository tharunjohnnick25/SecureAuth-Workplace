import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: leaves, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: leaves });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, startDate, endDate, reason } = body;
    
    if (!type || !startDate || !endDate || !reason) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Create leave request
    const { data: leaveReq, error: leaveError } = await supabase
      .from('leaves')
      .insert([{
         user_id: user.id,
         type,
         start_date: startDate,
         end_date: endDate,
         reason,
         status: 'Pending'
      }]).select().single();

    if (leaveError) throw leaveError;

    // Create an approval request for the admin inbox
    await supabase.from('approvals').insert([{
       type: 'LEAVE',
       requester_id: user.id,
       data_payload: { leaveId: leaveReq.id, type, startDate, endDate, reason },
       status: 'PENDING'
    }]);

    // Optionally notify admin
    
    return NextResponse.json({ success: true, data: leaveReq });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
