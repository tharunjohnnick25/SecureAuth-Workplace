import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Fetch caller profile to determine company and role
    const { data: profile } = await admin
      .from('users')
      .select('id, company_id, role, manager_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const role = (profile.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isManager = role === 'MANAGER';

    // Manager scope: their direct reports only
    let scopedUserIds: string[] | null = null;
    if (isManager) {
      const { data: reports } = await admin.from('users').select('id').eq('manager_id', session.user.id);
      scopedUserIds = [session.user.id, ...(reports || []).map(r => r.id)];
    }

    let query = admin
      .from('attendance')
      .select('*, users!inner(first_name, last_name, role, full_name, email, department, employee_id)', { count: 'exact' });

    // RLS Enforcement at API layer
    if (isAdmin) {
      if (profile.company_id) query = query.eq('company_id', profile.company_id);
      // Admins can only view managers
      query = query.eq('users.role', 'manager');
    } else if (isManager) {
      query = query.in('user_id', scopedUserIds || []);
    } else {
      query = query.eq('user_id', session.user.id);
    }

    if (targetUserId) {
      // If requesting specific user, ensure it's either themselves or they have visibility
      if (targetUserId !== session.user.id) {
        if (isAdmin) {
          query = query.eq('user_id', targetUserId);
        } else if (isManager && scopedUserIds?.includes(targetUserId)) {
          query = query.eq('user_id', targetUserId);
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        query = query.eq('user_id', targetUserId);
      }
    } else if (isManager || !isAdmin) {
      // non-admins without a specific target only see their visible scope
      if (isManager) {
        query = query.in('user_id', scopedUserIds || []);
      }
    }

    query = query.order('date', { ascending: false }).range(offset, offset + limit - 1);

    const { data: records, count, error } = await query;

    if (error) {
      console.error('Attendance query error:', error);
      return NextResponse.json({ error: 'Failed to fetch attendance history' }, { status: 500 });
    }

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
