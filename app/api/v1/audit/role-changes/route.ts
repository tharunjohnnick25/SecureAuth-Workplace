import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { isMockMode } from '@/lib/mock-employees';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const changedBy = url.searchParams.get('changedBy');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (isMockMode()) {
    // In mock mode, we can just return empty array since we just console.logged changes
    return NextResponse.json({ logs: [], total: 0, page });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from('role_change_logs').select(`
    id, old_role, new_role, reason, timestamp,
    user:users!user_id(id, email, full_name),
    changer:users!changed_by(id, email, full_name)
  `, { count: 'exact' });

  if (userId) query = query.eq('user_id', userId);
  if (changedBy) query = query.eq('changed_by', changedBy);
  if (startDate) query = query.gte('timestamp', startDate);
  if (endDate) query = query.lte('timestamp', endDate);

  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('timestamp', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data, total: count || 0, page });
}

export const GET = requireRole([ROLES.ADMIN], handler);
