import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const POST = requireRole(['admin', 'super_admin'], requireCompanyAccess(async (req: NextRequest, user, companyId, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    
    // Verify grant exists and belongs to company
    const { data: grant, error: reqError } = await supabase
      .from('user_permissions')
      .select('id, user_id, permission, expires_at')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (reqError || !grant) {
      return NextResponse.json({ error: 'Grant not found or unauthorized', success: false }, { status: 404 });
    }

    // Check if already expired manually
    const now = new Date().toISOString();
    if (grant.expires_at && new Date(grant.expires_at) < new Date(now)) {
       return NextResponse.json({ error: 'Grant is already expired or revoked', success: false }, { status: 400 });
    }

    // Update expires_at to NOW() effectively revoking access
    const { error: updateError } = await supabase
      .from('user_permissions')
      .update({ expires_at: now })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) throw updateError;

    // Audit logging
    await logAuditEvent(user.id, companyId, {
      action: 'ACCESS_REVOKED',
      resource: 'user_permissions',
      entity_id: id,
      details: { revoked_user_id: grant.user_id, permission: grant.permission }
    }, req);

    return NextResponse.json({ success: true, message: 'Access grant revoked successfully.' });
  } catch (error: any) {
    console.error('Revoke error:', error);
    return NextResponse.json({ error: 'Failed to revoke access', success: false }, { status: 500 });
  }
}));
