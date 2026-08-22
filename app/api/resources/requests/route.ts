import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { fetchResourceRequests, createResourceRequest, ResourceServiceError } from '@/lib/resource-service';
import { fetchProfile } from '@/lib/leave-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const admin = await createAdminClient();
    const caller = await fetchProfile(admin, session.user.id);
    if (!caller) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const managerId = searchParams.get('manager_id');

    // If manager_id is provided, it means a manager is fetching team requests.
    // We pass `userId: userId` if it exists, otherwise it fetches based on the caller's role.
    const requests = await fetchResourceRequests(admin, caller, { 
      userId: userId || undefined, 
      includeSelfForManager: false 
    });
    
    // The frontend expects req.reason to contain "[Resource Name] - reason"
    // So we map it back for backwards compatibility with the existing UI
    const mappedRequests = requests.map(req => ({
      ...req,
      reason: `[${req.resource_name}] - ${req.reason}`,
      status: req.status.toLowerCase(),
      email: req.user_email,
      users: { role: req.user_role }
    }));

    return NextResponse.json({ data: mappedRequests, success: true });
  } catch (err: any) {
    console.error('[API GET /api/resources/requests] Error:', err);
    if (err instanceof ResourceServiceError) {
      return NextResponse.json({ error: err.message, success: false }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal Server Error', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const body = await req.json();
    if (!body.reason) {
      return NextResponse.json({ error: 'Missing required field: reason', success: false }, { status: 400 });
    }

    const admin = await createAdminClient();
    const caller = await fetchProfile(admin, session.user.id);

    if (!caller) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    // Extract resource name from the old format: "[Resource Name] - Justification"
    const match = body.reason.match(/^\[(.*?)\]\s*-\s*(.*)$/);
    const resource_name = match ? match[1] : 'Requested Resource';
    const actual_reason = match ? match[2] : body.reason;

    const newRequest = await createResourceRequest(admin, caller, {
      resource_name,
      access_level: 'Standard',
      reason: actual_reason
    }, req);

    return NextResponse.json({ data: newRequest, success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[API POST /api/resources/requests] Error:', err);
    if (err instanceof ResourceServiceError) {
      return NextResponse.json({ error: err.message, success: false }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal Server Error', success: false }, { status: 500 });
  }
}
