import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { actionLeave, fetchProfile, LeaveServiceError } from '@/lib/leave-service';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { leave_id, status, admin_remarks } = body;

    const data = await actionLeave(admin, caller, { leave_id, status, admin_remarks }, req);

    return NextResponse.json({ message: `Leave request ${String(status || '').toUpperCase()}`, data });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Leave approve error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
