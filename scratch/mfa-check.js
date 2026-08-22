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
  console.log('=== auth.mfa_factors ===');
  const factors = await runSql('factors', `SELECT f.id, f.user_id, f.friendly_name, f.factor_type, f.status, u.email, f.created_at FROM auth.mfa_factors f LEFT JOIN auth.users u ON u.id = f.user_id ORDER BY f.created_at`);
  if (!factors.length) console.log('(0 rows — no TOTP factor enrolled for any user)');
  else console.log(JSON.stringify(factors, null, 1));

  console.log('\n=== public.users mfa columns ===');
  const users = await runSql('users', `SELECT u.email, u.mfa_enabled, u.is_mfa_enabled, u.mfa_secret IS NOT NULL AS has_mfa_secret FROM public.users u ORDER BY u.email`);
  console.log(JSON.stringify(users, null, 1));

  console.log('\n=== companies mfa_policy ===');
  const comp = await runSql('comp', `SELECT name, mfa_policy FROM public.companies`);
  console.log(JSON.stringify(comp, null, 1));
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
