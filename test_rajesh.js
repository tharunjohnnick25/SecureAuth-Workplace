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
  
  query = query.in('users.id', ['862b7997-36fb-485f-ab7f-44a733d2789e']); // Rajesh's ID

  const { data, error } = await query;
  console.log('Result:', data);
  console.log('Error:', error);
}
run();
