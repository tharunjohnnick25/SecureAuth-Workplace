import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  try {
    const { leave_id, status, admin_remarks } = await req.json();

    if (!leave_id || !['APPROVED', 'REJECTED', 'INFO_REQUESTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (isMockMode()) {
      const reqIdx = (MockDB.leave_requests || []).findIndex((r: any) => r.id === leave_id);
      if (reqIdx === -1) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
      }
      const updatedReq: any = MockDB.leave_requests[reqIdx];
      updatedReq.status = status;
      updatedReq.admin_remarks = admin_remarks || null;
      updatedReq.updated_at = new Date().toISOString();
      saveMockDB();
      return NextResponse.json({ message: `Leave request ${status}`, data: updatedReq });
    }

    const supabase = await createServerSupabaseClient();
    
    // Auth check should be here to ensure only Admin can perform this.
    // Assuming admin role is checked upstream or via middleware for this endpoint.

    const { data: updateData, error: updateError } = await supabase
      .from('leave_requests')
      .update({ status, admin_remarks, updated_at: new Date().toISOString() })
      .eq('id', leave_id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    // Insert notification for the employee (suppressed if employee is in a focus block)
    await sendNotification(supabase, {
      user_id: updateData.user_id,
      type: 'SYSTEM_ALERT',
      title: `Leave Request ${status}`,
      message: `Your leave request has been ${status.toLowerCase()}. Remarks: ${admin_remarks || 'None'}`
    });

    // If APPROVED, we might want to update the leave balances or attendance records here
    // but the system has triggers or we can do it manually.

    return NextResponse.json({ message: `Leave request ${status}`, data: updateData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
