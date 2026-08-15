import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getUserSession } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const roleFilter = url.searchParams.get('role');
  const deptFilter = url.searchParams.get('department');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (isMockMode()) {
    let users = MockEmployees.getAll().filter(u => !u.is_deleted);
    
    if (roleFilter) {
      users = users.filter(u => u.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    if (deptFilter) {
      users = users.filter(u => u.department?.toLowerCase() === deptFilter.toLowerCase());
    }

    const total = users.length;
    const paginated = users.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ users: paginated, total, page });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from('users').select('id, email, full_name, role, department, manager_id, last_login, created_at', { count: 'exact' });

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

export const GET = requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN], handler);
