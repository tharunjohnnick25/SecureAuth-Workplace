/**
 * Database integrity audit against the live Supabase backend.
 *
 * Uses the service_role-granted admin_exec_sql RPC to introspect the live
 * database: tables, RLS status, row counts, and cross-table referential
 * integrity. Read-only — never writes.
 *
 * Usage: node scratch/audit-db.js
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function runSql(label, query) {
  const { data, error } = await supabase.rpc('admin_exec_sql', { query });
  if (error) throw new Error(`${label}: ${error.message}`);
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

(async () => {
  // 1. Tables + RLS + sizes
  section('TABLES (public schema)');
  const tables = await runSql('tables', `
    SELECT t.tablename AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.reltuples::bigint AS est_rows
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename
  `);
  const seen = new Set();
  tables.forEach((r) => {
    if (seen.has(r.table_name)) return;
    seen.add(r.table_name);
    console.log(`  ${r.table_name.padEnd(38)} RLS: ${r.rls_enabled ? 'yes' : 'NO '}  est_rows: ${r.est_rows}`);
  });

  // 2. Referential integrity
  section('INTEGRITY CHECKS');
  const checks = {
    'auth.users without public.users profile': `
      SELECT au.email FROM auth.users au
      LEFT JOIN public.users u ON u.id = au.id
      WHERE u.id IS NULL`,
    'public.users orphans (no matching auth user)': `
      SELECT u.email FROM public.users u
      LEFT JOIN auth.users au ON au.id = u.id
      WHERE au.id IS NULL`,
    'manager_id pointing to missing user': `
      SELECT u.email FROM public.users u
      LEFT JOIN public.users m ON m.id = u.manager_id
      WHERE u.manager_id IS NOT NULL AND m.id IS NULL`,
    'users with null email or role': `
      SELECT email, role FROM public.users WHERE email IS NULL OR role IS NULL OR email = ''`,
    'duplicate emails in public.users': `
      SELECT email, count(*) FROM public.users GROUP BY email HAVING count(*) > 1`,
    'leave_requests with missing user': `
      SELECT lr.id FROM leave_requests lr
      LEFT JOIN public.users u ON u.id = lr.user_id WHERE u.id IS NULL`,
    'employee_requests with missing user': `
      SELECT er.id FROM employee_requests er
      LEFT JOIN public.users u ON u.id = er.user_id WHERE u.id IS NULL`,
  };
  for (const [label, query] of Object.entries(checks)) {
    try {
      const rows = await runSql(label, query);
      const count = Array.isArray(rows) ? rows.length : 0;
      console.log(`  ${count === 0 ? 'OK ' : 'ISSUE'}  ${label}: ${count}`);
      if (count > 0) console.log('       ->', JSON.stringify(rows).slice(0, 400));
    } catch (err) {
      console.log(`  SKIP ${label}: ${err.message.split(':').slice(-1)[0].trim()}`);
    }
  }

  // 3. Row counts for key business tables
  section('KEY TABLES ROW COUNTS');
  for (const tbl of ['users', 'leave_requests', 'employee_requests', 'departments', 'roles', 'notifications', 'companies', 'access_grants', 'access_requests']) {
    try {
      const rows = await runSql(`count ${tbl}`, `SELECT count(*) AS n FROM public.${tbl}`);
      console.log(`  ${tbl.padEnd(24)} ${rows[0]?.n ?? 0}`);
    } catch (err) {
      console.log(`  ${tbl.padEnd(24)} (missing)`);
    }
  }

  // 4. Sample current user data for sanity
  section('CURRENT USERS');
  const users = await runSql('users', `
    SELECT u.email, u.role, u.department, u.status,
           (m.email) AS manager_email
    FROM public.users u
    LEFT JOIN public.users m ON m.id = u.manager_id
    ORDER BY u.email
  `);
  users.forEach((u) =>
    console.log(`  ${(u.email || '').padEnd(26)} role: ${String(u.role).padEnd(9)} dept: ${String(u.department || '').padEnd(20)} status: ${String(u.status).padEnd(8)} manager: ${u.manager_email || '-'}`)
  );

  console.log('\nAudit complete.');
})().catch((err) => {
  console.error('AUDIT FAILED:', err.message);
  process.exit(1);
});
