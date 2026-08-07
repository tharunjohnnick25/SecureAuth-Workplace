import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: approvals, error } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: approvals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, comments } = body; // status = APPROVED or REJECTED
    
    if (!id || !status) return NextResponse.json({ success: false, error: 'ID and status required' }, { status: 400 });

    const { data: approval, error: fetchError } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !approval) return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
    if (approval.status !== 'PENDING') return NextResponse.json({ success: false, error: 'Already processed' }, { status: 400 });

    // Process the approval effect if APPROVED
    if (status === 'APPROVED') {
       if (approval.type === 'PROFILE_UPDATE') {
          await supabase.from('users').update(approval.data_payload).eq('id', approval.requester_id);
       } else if (approval.type === 'LEAVE') {
          await supabase.from('leaves').update({ status: 'Approved' }).eq('id', approval.data_payload.leaveId);
       } else if (approval.type === 'DOCUMENT') {
          await supabase.from('documents').update({ is_verified: true }).eq('id', approval.data_payload.documentId);
       }
    } else if (status === 'REJECTED') {
       if (approval.type === 'LEAVE') {
          await supabase.from('leaves').update({ status: 'Rejected' }).eq('id', approval.data_payload.leaveId);
       }
    }

    const { data: updatedApproval, error: updateError } = await supabase
      .from('approvals')
      .update({ 
         status, 
         approver_id: user.id, 
         comments: comments || '', 
         updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // Notify Requester (suppressed while they're in a focus block)
    await sendNotification(supabase, {
       user_id: approval.requester_id,
       type: 'APPROVAL_UPDATE',
       title: `Request ${status}`,
       message: `Your ${approval.type.toLowerCase().replace('_', ' ')} request was ${status.toLowerCase()}. ${comments ? `Comments: ${comments}` : ''}`
    });

    return NextResponse.json({ success: true, data: updatedApproval });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
