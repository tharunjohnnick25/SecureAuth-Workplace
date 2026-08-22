import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: currentUser } = await admin
      .from('users')
      .select('id, company_id, role, manager_id')
      .eq('id', session.user.id)
      .single();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const role = (currentUser.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isManager = role === 'MANAGER';
    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden: Admin access required', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Manager scope: their direct reports AND themselves
    let scopedUserIds: string[] | null = null;
    if (isManager) {
      const { data: reports } = await admin.from('users').select('id').eq('manager_id', session.user.id);
      scopedUserIds = [session.user.id, ...(reports || []).map(r => r.id)];
    }

    // First try the 'attendance' table
    let query = admin.from('attendance').select(`
      *,
      users!inner (
        full_name,
        email,
        department,
        employee_id,
        company_id,
        manager_id
      )
    `, { count: 'exact' });

    // Enforce Company Isolation (admins) / reporting scope (managers)
    if (isAdmin) {
      if (currentUser.company_id) {
        query = query.eq('users.company_id', currentUser.company_id);
      }
      // Admins can only view managers
      query = query.eq('users.role', 'manager');
    } else if (scopedUserIds) {
      query = query.in('users.id', scopedUserIds);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`, { foreignTable: 'users' });
    }

    if (department) {
      query = query.eq('users.department', department);
    }

    if (date_from) query = query.gte('date', date_from);
    if (date_to) query = query.lte('date', date_to);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('date', { ascending: false }).order('check_in', { ascending: false }).range(from, to);

    let { data, count, error } = await query;

    // Fallback to 'attendance_records' if 'attendance' fails (e.g. doesn't exist)
    if (error) {
      console.warn("attendance table query failed, falling back to attendance_records", error.message);
      let fallbackQuery = admin.from('attendance_records').select(`
        *,
        users!inner (
          full_name,
          email,
          department,
          employee_id,
          company_id,
          manager_id
        )
      `, { count: 'exact' });

      if (isAdmin) {
        if (currentUser.company_id) {
          fallbackQuery = fallbackQuery.eq('users.company_id', currentUser.company_id);
        }
        // Admins can only view managers
        fallbackQuery = fallbackQuery.eq('users.role', 'manager');
      } else if (scopedUserIds) {
        fallbackQuery = fallbackQuery.in('users.id', scopedUserIds);
      }
      if (search) {
        fallbackQuery = fallbackQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`, { foreignTable: 'users' });
      }
      if (department) {
        fallbackQuery = fallbackQuery.eq('users.department', department);
      }
      if (date_from) fallbackQuery = fallbackQuery.gte('date', date_from);
      if (date_to) fallbackQuery = fallbackQuery.lte('date', date_to);

      fallbackQuery = fallbackQuery.order('date', { ascending: false }).order('check_in', { ascending: false }).range(from, to);

      const fallbackResult = await fallbackQuery;
      data = fallbackResult.data;
      count = fallbackResult.count;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("Attendance API Error:", error);
      throw error;
    }

    // Process data to calculate duration
    const processedData = (data || [])?.map((record) => {
      let durationStr = '-';
      if (record.check_in && record.check_out) {
        const inTime = new Date(record.check_in).getTime();
        const outTime = new Date(record.check_out).getTime();
        const diffMs = Math.max(0, outTime - inTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationStr = `${hours}h ${minutes}m`;
      } else if (record.check_in) {
        // Calculate duration until now if still checked in
        const inTime = new Date(record.check_in).getTime();
        const now = new Date().getTime();
        if (record.date === new Date().toISOString().split('T')[0]) {
          const diffMs = Math.max(0, now - inTime);
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${hours}h ${minutes}m (Active)`;
        }
      }

      return {
        id: record.id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
        duration: durationStr,
        employee_id: record.users?.employee_id || record.employee_id || record.user_id,
        full_name: record.users?.full_name || 'Unknown Employee',
        email: record.users?.email,
        department: record.users?.department || 'Unassigned',
        ip_address: record.ip_address || null,
        location_in: record.location_in || null,
        location_out: record.location_out || null,
        lat: record.lat ?? null,
        lon: record.lon ?? null,
      };
    });

    return NextResponse.json({ data: processedData || [], total: count || 0, success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch attendance records', success: false }, { status: 500 });
  }
}
