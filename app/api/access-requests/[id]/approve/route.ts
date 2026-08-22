import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const POST = requireCompanyAccess(async (req: NextRequest, user, companyId, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    // 1. Verify request exists and belongs to company
    const { data: accessRequest, error: reqError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (reqError || !accessRequest) {
      return NextResponse.json({ error: 'Request not found or unauthorized', success: false }, { status: 404 });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((user.role || '').toUpperCase());
    const isManager = (user.role || '').toUpperCase() === 'MANAGER';

    // 2. Fetch Requester Info
    const { data: requester } = await supabase
      .from('users')
      .select('manager_id, role')
      .eq('id', accessRequest.requester_id)
      .eq('company_id', companyId)
      .single();

    if (!requester) {
       return NextResponse.json({ error: 'Requester not found', success: false }, { status: 404 });
    }

    // 3. Logic: 3-Tier Approval Flow
    const currentStatus = accessRequest.status;
    const requesterRole = (requester.role || '').toUpperCase();

    if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED') {
      return NextResponse.json({ error: `Request is already ${currentStatus}`, success: false }, { status: 400 });
    }

    if (isManager) {
      // Managers can only approve PENDING requests from their direct reports
      if (requesterRole !== 'EMPLOYEE' || requester.manager_id !== user.id) {
        return NextResponse.json({ error: 'Managers can only approve requests from their direct reports', success: false }, { status: 403 });
      }
      
      if (currentStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Request is not in PENDING state', success: false }, { status: 400 });
      }

      // Update to MANAGER_APPROVED (No token provisioned yet)
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ status: 'MANAGER_APPROVED', updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (updateError) throw updateError;

      await logAuditEvent(user.id, companyId, {
        action: 'ACCESS_REQUEST_MANAGER_APPROVED',
        resource: 'access_requests',
        entity_id: id,
        details: { requester_id: accessRequest.requester_id, module: accessRequest.module }
      }, req);

      return NextResponse.json({ success: true, message: 'Request approved by Manager. Awaiting Admin final approval.' });
    } 
    
    if (isAdmin) {
      // Admins can approve PENDING requests (if requester is Manager) OR MANAGER_APPROVED requests
      if (requesterRole === 'MANAGER') {
        if (currentStatus !== 'PENDING') {
           return NextResponse.json({ error: 'Manager request must be PENDING for Admin approval', success: false }, { status: 400 });
        }
      } else {
        if (currentStatus !== 'MANAGER_APPROVED' && currentStatus !== 'PENDING') {
           // Allow admin to override and approve pending directly if needed, but normally MANAGER_APPROVED is expected
        }
      }

      // Calculate expiration if duration is specified
      let expiresAt = null;
      if (accessRequest.duration_hours) {
         const d = new Date();
         d.setHours(d.getHours() + accessRequest.duration_hours);
         expiresAt = d.toISOString();
      }

      // 4. Provision the Access Grant (Insert into user_permissions)
      const grant = {
          user_id: accessRequest.requester_id,
          company_id: companyId,
          permission: accessRequest.module,
          granted_by: user.id,
          expires_at: expiresAt
      };

      const { data: newGrant, error: grantError } = await supabase
          .from('user_permissions')
          .insert([grant])
          .select()
          .single();
          
      if (grantError) {
          if (grantError.code === '23505') {
              return NextResponse.json({ error: 'User already has an active grant for this module.', success: false }, { status: 409 });
          }
          throw grantError;
      }

      // 5. Update Request Status to APPROVED
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ status: 'APPROVED', approved_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
         await supabase.from('user_permissions').delete().eq('id', newGrant.id);
         throw updateError;
      }

      await logAuditEvent(user.id, companyId, {
        action: 'ACCESS_REQUEST_APPROVED',
        resource: 'access_requests',
        entity_id: id,
        details: { requester_id: accessRequest.requester_id, module: accessRequest.module }
      }, req);

      await logAuditEvent(user.id, companyId, {
        action: 'ACCESS_GRANTED',
        resource: 'user_permissions',
        entity_id: newGrant.id,
        details: { user_id: accessRequest.requester_id, permission: accessRequest.module, expires_at: expiresAt }
      }, req);

      return NextResponse.json({ success: true, message: 'Request fully approved and access granted.' });
    }

    return NextResponse.json({ error: 'Unauthorized role', success: false }, { status: 403 });
  } catch (error: any) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Failed to approve request', success: false }, { status: 500 });
  }
});
