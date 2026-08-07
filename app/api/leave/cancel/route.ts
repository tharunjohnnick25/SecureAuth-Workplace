import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function PATCH(req: NextRequest) {
  try {
    const { leave_id } = await req.json();

    if (!leave_id) {
      return NextResponse.json({ error: 'Missing leave_id' }, { status: 400 });
    }

    if (isMockMode()) {
      const reqIdx = (MockDB.leave_requests || []).findIndex(
        (r: any) => r.id === leave_id && ['Pending', 'PENDING'].includes(r.status)
      );
      if (reqIdx === -1) {
        return NextResponse.json({ error: 'Cannot cancel this request. It might be already processed.' }, { status: 400 });
      }
      MockDB.leave_requests.splice(reqIdx, 1);
      saveMockDB();
      return NextResponse.json({ message: 'Leave request cancelled successfully' });
    }

    const supabase = await createServerSupabaseClient();

    // Usually RLS policies (e.g. `auth.uid() = user_id AND status = 'PENDING'`) protect this
    const { data: updateData, error: updateError } = await supabase
      .from('leave_requests')
      .delete() // Or update status to 'CANCELLED', depending on requirements. Let's delete it.
      .eq('id', leave_id)
      .eq('status', 'PENDING') // Only pending can be cancelled
      .select();

    if (updateError) {
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ error: 'Cannot cancel this request. It might be already processed.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Leave request cancelled successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
