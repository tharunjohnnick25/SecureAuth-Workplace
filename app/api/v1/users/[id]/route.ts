import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// PATCH /api/v1/users/:id/role
async function patchHandler(req: NextRequest, sessionUser: any, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = id;
    const body = await req.json();
    const { role, department, managerId, reason } = body;

    const supabase = await createServerSupabaseClient();
    
    // Fetch old role for audit
    const { data: oldUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const oldRole = oldUser?.role || 'employee';

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: role.toLowerCase(),
        department,
        manager_id: managerId
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Insert audit log
    await supabase.from('role_change_logs').insert({
      user_id: userId,
      changed_by: sessionUser.id,
      old_role: oldRole,
      new_role: role.toLowerCase(),
      reason: reason || null
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/v1/users/:id
async function deleteHandler(req: NextRequest, sessionUser: any, context: { params: Promise<{ id: string }> }) {
  try {
    // Only admin can delete
    if (sessionUser.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const userId = id;

    const supabase = await createServerSupabaseClient();
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Export wrapped handlers
export const PATCH = requireRole([ROLES.ADMIN], patchHandler);
export const DELETE = requireRole([ROLES.ADMIN], deleteHandler);
