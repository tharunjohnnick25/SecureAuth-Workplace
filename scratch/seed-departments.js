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

const COMPANY_ID = '4dddf0d5-d6e5-43dc-8fd2-03d5a91bf031';
const HELLA = '3c07081b-d363-486f-8099-3cc5fddcb52f'; // manager, Cybersecurity & SOC
const THARUN = 'a795a98f-3649-4e3e-82be-5ca29928760a'; // admin, Security

const DEPARTMENTS = [
  { name: 'Cybersecurity & SOC', description: 'Security operations and threat monitoring', head: HELLA },
  { name: 'Security', description: 'Enterprise security administration', head: THARUN },
  { name: 'Engineering', description: 'Software and platform engineering', head: null }
];

(async () => {
  for (const d of DEPARTMENTS) {
    const head = d.head ? `'${d.head}'::uuid` : 'NULL';
    const q = `
      INSERT INTO public.departments (name, description, head, employee_count, company_id)
      SELECT '${d.name}', '${d.description}', ${head}, 0, '${COMPANY_ID}'::uuid
      WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = '${d.name}' AND company_id = '${COMPANY_ID}'::uuid);
    `;
    const rows = await runSql(`seed ${d.name}`, q);
    console.log(`${d.name}: inserted = ${Array.isArray(rows) ? rows.length : 0}`);
  }

  const depts = await runSql('verify', 'SELECT id, name, head, employee_count, company_id FROM public.departments ORDER BY name');
  console.log('\n=== DEPARTMENTS AFTER SEED ===');
  console.log(JSON.stringify(depts, null, 1));
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
