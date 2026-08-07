import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { isMockMode } from '@/lib/mock-employees';

const SUPER_ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const MOCK_RESULTS: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: 'u-001', email: 'admin@test.com', role: 'SUPER_ADMIN', first_name: 'Admin', last_name: 'User', created_at: '2026-01-15T09:00:00Z' },
    { id: 'u-002', email: 'employee@test.com', role: 'EMPLOYEE', first_name: 'John', last_name: 'Employee', created_at: '2026-02-01T10:30:00Z' },
  ],
  leave_requests: [
    { id: 'lr-1', user_id: 'u-002', leave_type: 'Sick Leave', start_date: '2026-08-10', end_date: '2026-08-12', status: 'PENDING', total_days: 3 },
    { id: 'lr-2', user_id: 'u-002', leave_type: 'Casual Leave', start_date: '2026-07-20', end_date: '2026-07-21', status: 'APPROVED', total_days: 2 },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Valid SQL query string is required' }, { status: 400 });
    }

    if (isMockMode()) {
      const trimmed = query.trim().toLowerCase();
      if (trimmed.startsWith('select') || trimmed.startsWith('show') || trimmed.startsWith('describe')) {
        const tableMatch = trimmed.match(/\bfrom\s+["'`]?([a-z_]+)/);
        const table = tableMatch?.[1] || '';
        const rows = MOCK_RESULTS[table] || [
          { id: 'row-1', result: 'Mock query executed (SELECT)', note: 'MockDB has no results for this query' },
        ];
        return NextResponse.json({ data: rows });
      }
      return NextResponse.json({ data: { status: 'success', message: 'Query executed successfully (mock mode)' } });
    }

    // 1. Verify user authentication and authorization using standard client
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check custom roles in the public.users table if role is not in JWT
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (userRecord?.role || 'EMPLOYEE').toUpperCase();

    if (!SUPER_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Requires SUPER_ADMIN or ADMIN role.' }, { status: 403 });
    }

    // 2. Initialize Service Role Client to execute the restricted RPC
    // We cannot use the standard client because execution is revoked from 'authenticated'.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error: Missing service role key.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 3. Execute the SQL via RPC
    const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query });

    if (error) {
      console.error('SQL Execution Error:', error);
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 400 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.error('API /admin/sql-editor Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
