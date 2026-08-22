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
  await runSql('recalc', "UPDATE public.departments d SET employee_count = (SELECT COUNT(*) FROM public.users u WHERE u.department = d.name AND u.is_deleted IS NOT TRUE) WHERE d.name IS NOT NULL");
  const depts = await runSql('verify', 'SELECT name, employee_count, avg_risk_score FROM public.departments ORDER BY name');
  console.log(JSON.stringify(depts, null, 1));
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
