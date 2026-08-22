import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const POST = requireCompanyAccess(async (req: NextRequest, user, companyId, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    
    let reason = null;
    try {
        const body = await req.json();
        reason = body.reason || null;
    } catch (e) {}

    const { data: accessRequest, error: reqError } = await supabase
      .from('access_requests')
      .select('id, status, requester_id, module')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (reqError || !accessRequest) {
      return NextResponse.json({ error: 'Request not found or unauthorized', success: false }, { status: 404 });
    }

    const currentStatus = accessRequest.status;
    if (currentStatus === 'REJECTED' || currentStatus === 'APPROVED') {
      return NextResponse.json({ error: `Request cannot be rejected because it is already ${currentStatus}`, success: false }, { status: 400 });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((user.role || '').toUpperCase());
    const isManager = (user.role || '').toUpperCase() === 'MANAGER';

    const { data: requester } = await supabase
      .from('users')
      .select('manager_id, role')
      .eq('id', accessRequest.requester_id)
      .eq('company_id', companyId)
      .single();

    if (!requester) {
       return NextResponse.json({ error: 'Requester not found', success: false }, { status: 404 });
    }

    if (isManager) {
      if ((requester.role || '').toUpperCase() !== 'EMPLOYEE' || requester.manager_id !== user.id) {
        return NextResponse.json({ error: 'You can only reject requests from your direct reports', success: false }, { status: 403 });
      }
      if (currentStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Request is not in PENDING state', success: false }, { status: 400 });
      }
    } else if (isAdmin) {
      if ((requester.role || '').toUpperCase() === 'MANAGER' && currentStatus !== 'PENDING') {
         return NextResponse.json({ error: 'Manager request must be PENDING for Admin rejection', success: false }, { status: 400 });
      } else if ((requester.role || '').toUpperCase() === 'EMPLOYEE' && currentStatus !== 'MANAGER_APPROVED' && currentStatus !== 'PENDING') {
         return NextResponse.json({ error: 'Invalid state for rejection', success: false }, { status: 400 });
      }
    }

    const { error: updateError } = await supabase
      .from('access_requests')
      .update({ status: 'REJECTED', approved_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) throw updateError;

    await logAuditEvent(user.id, companyId, {
      action: 'ACCESS_REQUEST_REJECTED',
      resource: 'access_requests',
      entity_id: id,
      details: { requester_id: accessRequest.requester_id, module: accessRequest.module, rejection_reason: reason }
    }, req);

    return NextResponse.json({ success: true, message: 'Request rejected successfully.' });
  } catch (error: any) {
    console.error('Reject error:', error);
    return NextResponse.json({ error: 'Failed to reject request', success: false }, { status: 500 });
  }
});
