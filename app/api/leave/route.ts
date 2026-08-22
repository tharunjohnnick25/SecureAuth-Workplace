import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import {
  createLeave,
  fetchLeaveRequests,
  fetchProfile,
  LeaveServiceError,
} from '@/lib/leave-service';

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
    const data = await createLeave(admin, caller, body, req);

    return NextResponse.json({ message: 'Leave request submitted successfully', data });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Leave create error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    const data = await fetchLeaveRequests(admin, caller, {
      userId,
      includeSelfForManager: true,
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Leave list error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
