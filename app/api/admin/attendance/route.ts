import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (isMockMode()) {
      const search = searchParams.get('search') || '';
      const department = searchParams.get('department') || '';
      const date_from = searchParams.get('date_from') || '';
      const date_to = searchParams.get('date_to') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');

      let records = (MockDB.attendance || []).map((record: any) => {
        const employee = (MockDB.employees || []).find(
          (e: any) => e.id === record.user_id || e.id === record.employee_id
        );
        let durationStr = '-';
        if (record.check_in && record.check_out) {
          const diffMs = Math.max(0, new Date(record.check_out).getTime() - new Date(record.check_in).getTime());
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${hours}h ${minutes}m`;
        } else if (record.check_in) {
          const diffMs = Math.max(0, Date.now() - new Date(record.check_in).getTime());
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${hours}h ${minutes}m (Active)`;
        }
        return {
          id: record.id,
          date: record.date,
          check_in: record.check_in,
          check_out: record.check_out,
          status: record.status || 'Present',
          duration: durationStr,
          employee_id: employee?.id || record.employee_id || record.user_id,
          full_name: employee?.full_name || 'Unknown Employee',
          email: employee?.email || '',
          department: employee?.department || 'Unassigned'
        };
      });

      if (search) {
        const q = search.toLowerCase();
        records = records.filter((r: any) =>
          (r.full_name || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          (r.employee_id || '').toLowerCase().includes(q)
        );
      }
      if (department) {
        records = records.filter((r: any) => r.department === department);
      }
      if (date_from) records = records.filter((r: any) => (r.date || '') >= date_from);
      if (date_to) records = records.filter((r: any) => (r.date || '') <= date_to);

      records.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

      const total = records.length;
      const from = (page - 1) * limit;
      const paginated = records.slice(from, from + limit);

      return NextResponse.json({ data: paginated, total, success: true });
    }

    const supabase = await createServerSupabaseClient();

    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase.from('attendance_records').select(`
      *,
      users!inner (
        full_name,
        email,
        department,
        employee_id
      )
    `, { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`, { referencedTable: 'users' });
    }
    
    if (department) {
      query = query.eq('users.department', department);
    }

    if (date_from) query = query.gte('date', date_from);
    if (date_to) query = query.lte('date', date_to);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('date', { ascending: false }).order('check_in', { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Attendance API Error:", error);
      throw error;
    }

    // Process data to calculate duration
    const processedData = data?.map((record: any) => {
      let durationStr = '-';
      if (record.check_in && record.check_out) {
        const inTime = new Date(record.check_in).getTime();
        const outTime = new Date(record.check_out).getTime();
        const diffMs = Math.max(0, outTime - inTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationStr = `${hours}h ${minutes}m`;
      } else if (record.check_in) {
        // Calculate duration until now if still checked in (status = present and no checkout)
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
        employee_id: record.users?.employee_id,
        full_name: record.users?.full_name,
        email: record.users?.email,
        department: record.users?.department || 'Unassigned'
      };
    });

    return NextResponse.json({ data: processedData || [], total: count || 0, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch attendance records', success: false }, { status: 500 });
  }
}
