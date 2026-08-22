const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function runSql(label, query) {
  const { data, error } = await supabase.rpc('admin_exec_sql', { query });
  if (error) throw new Error(`${label}: ${error.message}`);
  try { return JSON.parse(data); } catch { return data; }
}

(async () => {
  console.log('=== ROLES ===');
  console.log(JSON.stringify(await runSql('roles', 'SELECT * FROM public.roles ORDER BY name'), null, 1));

  console.log('\n=== COMPANIES ===');
  console.log(JSON.stringify(await runSql('companies', 'SELECT * FROM public.companies'), null, 1));

  console.log('\n=== DEPARTMENTS ===');
  console.log(JSON.stringify(await runSql('depts', 'SELECT * FROM public.departments'), null, 1));

  console.log('\n=== AUTH vs PROFILES ===');
  const authUsers = await runSql('auth', 'SELECT email, created_at FROM auth.users ORDER BY created_at');
  console.log('Auth users:', authUsers.map((u) => u.email).join(', '));

  console.log('\n=== USER PERMISSIONS ===');
  console.log(JSON.stringify(await runSql('perm', 'SELECT * FROM public.user_permissions'), null, 1));

  console.log('\n=== NOTIFICATIONS / AUDIT / LOGIN_HISTORY ===');
  for (const t of ['notifications', 'audit_logs', 'login_history', 'roles', 'user_permissions', 'leave_balances']) {
    try {
      const rows = await runSql(`count ${t}`, `SELECT count(*) AS n FROM public.${t}`);
      console.log(`  ${t}: ${rows[0]?.n ?? 0}`);
    } catch { console.log(`  ${t}: (missing)`); }
  }
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
