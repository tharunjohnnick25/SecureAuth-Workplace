import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { actionResourceRequest, ResourceServiceError, RESOURCE_STATUS } from '@/lib/resource-service';
import { fetchProfile } from '@/lib/leave-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const body = await req.json();
    const { request_id, action } = body;

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters', success: false }, { status: 400 });
    }

    const admin = await createAdminClient();
    const caller = await fetchProfile(admin, session.user.id);

    if (!caller) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    const role = caller.role?.toUpperCase() || '';
    const isManager = role === 'MANAGER';
    
    // For Managers, "approve" means MANAGER_APPROVED.
    // For Admins, "approve" means APPROVED.
    let statusAction = RESOURCE_STATUS.REJECTED;
    if (action === 'approve') {
       statusAction = isManager ? RESOURCE_STATUS.MANAGER_APPROVED : RESOURCE_STATUS.APPROVED;
    }

    const updated = await actionResourceRequest(admin, caller, {
      request_id,
      status: statusAction
    }, req);

    return NextResponse.json({ data: updated, success: true });
  } catch (err: any) {
    console.error('[API POST /api/resources/approve] Error:', err);
    if (err instanceof ResourceServiceError) {
      return NextResponse.json({ error: err.message, success: false }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal Server Error', success: false }, { status: 500 });
  }
}
