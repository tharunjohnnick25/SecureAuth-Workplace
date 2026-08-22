import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { cancelLeave, fetchProfile, LeaveServiceError } from '@/lib/leave-service';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caller = await fetchProfile(admin, session.user.id);
    if (!caller) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { leave_id } = await req.json();
    await cancelLeave(admin, caller, leave_id, req);

    return NextResponse.json({ message: 'Leave request cancelled successfully' });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Leave cancel error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
