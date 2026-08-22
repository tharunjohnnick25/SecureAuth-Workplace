import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { actionLeave, fetchProfile, LeaveServiceError } from '@/lib/leave-service';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, admin_remarks } = body;

    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const caller = await fetchProfile(admin, session.user.id);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
    }

    const data = await actionLeave(admin, caller, { leave_id: id, status, admin_remarks }, req);

    return NextResponse.json({ data, success: true });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Leave update error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update leave request' }, { status: 500 });
  }
}
