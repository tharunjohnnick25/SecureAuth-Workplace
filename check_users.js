const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabaseAdmin.from('users').select('id, email, full_name, role, company_id, manager_id');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log(users);
}
run();
