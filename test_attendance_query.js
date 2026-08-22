const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  let query = supabaseAdmin.from('attendance').select(`
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
  
  query = query.in('users.id', ['bbd21573-80a4-4a26-9201-603d79540d47']); // Oviya's ID

  const { data, error } = await query;
  console.log('Result:', data);
  console.log('Error:', error);
}
run();
