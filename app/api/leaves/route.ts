import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import {
  createLeave,
  fetchLeaveRequests,
  fetchProfile,
  LeaveServiceError,
} from '@/lib/leave-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const caller = await fetchProfile(admin, session.user.id);
    if (!caller) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    const data = await fetchLeaveRequests(admin, caller, { userId });

    return NextResponse.json({ data, success: true });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code, success: false }, { status: err.status });
    }
    console.error('Leaves list error:', err);
    return NextResponse.json({ error: 'Failed to fetch leaves', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const caller = await fetchProfile(admin, session.user.id);
    if (!caller) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    const body = await req.json();
    const input = {
      leave_type: body.type || body.leave_type,
      start_date: body.start_date,
      end_date: body.end_date,
      reason: body.reason,
      document_url: body.document_url,
    };
    const data = await createLeave(admin, caller, input, req);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof LeaveServiceError) {
      return NextResponse.json({ error: err.message, code: err.code, success: false }, { status: err.status });
    }
    console.error('Leaves create error:', err);
    return NextResponse.json({ error: 'Failed to create leave request', success: false }, { status: 500 });
  }
}
