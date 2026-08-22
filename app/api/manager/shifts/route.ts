import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// GET — return saved shifts for the caller's direct reports
export const GET = requireRole(['admin', 'super_admin', 'manager'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: team } = await supabase
      .from('users')
      .select('id')
      .eq('manager_id', user.id)
      .eq('company_id', companyId);

    const teamIds = (team || []).map((t: any) => t.id);
    if (teamIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from('shift_assignments')
      .select('user_id, shift')
      .eq('company_id', companyId)
      .in('user_id', teamIds);

    if (error) throw error;

    const shifts = (data || []).map((s: any) => ({ id: s.user_id, shift_timing: s.shift }));
    return NextResponse.json({ success: true, data: shifts });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch shifts', success: false }, { status: 500 });
  }
}));

// POST — persist a shift assignment for a team member
export const POST = requireRole(['admin', 'super_admin', 'manager'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { user_id, current_shift } = body || {};

    if (!user_id || !current_shift) {
      return NextResponse.json({ error: 'user_id and current_shift are required', success: false }, { status: 400 });
    }

    // Managers may only assign shifts to their direct reports; admins may manage anyone in the company
    if (user.role === 'manager') {
      const { data: target } = await supabase
        .from('users')
        .select('id, manager_id')
        .eq('id', user_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (!target || target.manager_id !== user.id) {
        return NextResponse.json({ error: 'Employee is not in your team', success: false }, { status: 403 });
      }
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const { data, error } = await (supabaseAdmin.from('shift_assignments') as any)
      .upsert({
        user_id,
        company_id: companyId,
        shift: current_shift,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,company_id' })
      .select('user_id, shift')
      .single();

    if (error) throw error;

    await logAuditEvent(user.id, companyId, {
      action: 'SHIFT_ASSIGNED',
      resource: 'shift_assignments',
      entity_id: user_id,
      details: { shift: current_shift }
    }, req);

    return NextResponse.json({ success: true, data: { id: data.user_id, shift_timing: data.shift } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to assign shift', success: false }, { status: 500 });
  }
}));
