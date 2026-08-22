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
  console.log('=== USERS (id, email, role, department, manager_id, company_id) ===');
  const users = await runSql('users', "SELECT id, email, role, department, manager_id, company_id FROM public.users ORDER BY email");
  console.log(JSON.stringify(users, null, 1));

  console.log('\n=== USERS table columns ===');
  const cols = await runSql('cols', "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position");
  console.log(cols.map((c) => `${c.column_name} (${c.data_type}, null=${c.is_nullable})`).join('\n'));

  console.log('\n=== DEPARTMENTS table columns ===');
  const dcols = await runSql('dcols', "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' ORDER BY ordinal_position");
  console.log(dcols.map((c) => `${c.column_name} (${c.data_type}, null=${c.is_nullable})`).join('\n'));

  console.log('\n=== COMPANIES table columns ===');
  const ccols = await runSql('ccols', "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' ORDER BY ordinal_position");
  console.log(ccols.map((c) => `${c.column_name} (${c.data_type}, null=${c.is_nullable})`).join('\n'));
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
