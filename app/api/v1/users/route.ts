import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getUserSession } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

import { createServerSupabaseClient } from '@/lib/supabase/server';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const roleFilter = url.searchParams.get('role');
  const deptFilter = url.searchParams.get('department');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const supabase = await createServerSupabaseClient();
  const { user } = await getUserSession();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let query = supabase.from('users').select('id, email, full_name, role, department, manager_id, last_login, created_at', { count: 'exact' });

  // ENFORCE COMPANY ISOLATION BY EMAIL DOMAIN
  if (user.email) {
    const domain = user.email.split('@')[1];
    if (domain) {
      query = query.like('email', `%@${domain}`);
    }
  }

  query = query.eq('is_deleted', false);

  if (roleFilter) {
    query = query.eq('role', roleFilter.toLowerCase());
  }
  if (deptFilter) {
    query = query.eq('department', deptFilter);
  }

  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map full_name to name as requested by schema, though full_name is fine.
  const users = data.map(u => ({
    ...u,
    name: u.full_name,
    lastLoginAt: u.last_login,
    createdAt: u.created_at,
    managerId: u.manager_id
  }));

  return NextResponse.json({ users, total: count || 0, page });
}

export const GET = requireRole([ROLES.ADMIN], handler);
