import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'manager_approved'];

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found', success: false }, { status: 404 });
    }

    const role = currentUser.role?.toUpperCase() || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    const isManager = role === 'MANAGER';
    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager access required', success: false }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status', success: false }, { status: 400 });
    }

    // Verify request exists and is in same org
    const { data: existingRequest } = await supabase.from('employee_requests').select('user_id, status').eq('id', id).maybeSingle();
    if (!existingRequest) {
      return NextResponse.json({ error: 'Access request not found', success: false }, { status: 404 });
    }

    if (currentUser.company_id) {
      const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', existingRequest.user_id).maybeSingle();
      if (!targetUser || targetUser.company_id !== currentUser.company_id) {
        return NextResponse.json({ error: 'Access request not found in your organization', success: false }, { status: 404 });
      }
    }

    if (isManager) {
      // Managers pre-approve (or reject) requests from their direct reports only.
      if (!['manager_approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Forbidden: Managers may only pre-approve or reject requests', success: false }, { status: 403 });
      }
      const { data: subordinate } = await supabase
        .from('users')
        .select('id')
        .eq('id', existingRequest.user_id)
        .eq('manager_id', session.user.id)
        .maybeSingle();
      if (!subordinate) {
        return NextResponse.json({ error: 'Forbidden: This request is not from a direct report', success: false }, { status: 403 });
      }
      if (existingRequest.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending requests can be actioned by a manager', success: false }, { status: 400 });
      }
    }

    if (isAdmin) {
      // Final approval is only possible after the manager has pre-approved (unless overriding).
      if (status === 'approved' && existingRequest.status !== 'manager_approved' && !body.override) {
        return NextResponse.json({
          error: 'Request must first be approved by the manager (or pass override: true)',
          success: false,
        }, { status: 400 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('employee_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    if (updated.user_id) {
      await sendNotification(supabase, {
        user_id: updated.user_id,
        type: `ACCESS_${status.toUpperCase()}`,
        title: `Access Request ${status}`,
        message: `Your access request has been ${status.replace('_', ' ')}.`,
        action_url: '/resources'
      });
    }

    return NextResponse.json({ data: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update access request', success: false }, { status: 500 });
  }
}
