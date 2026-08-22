const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const oviyaId = 'bbd21573-80a4-4a26-9201-603d79540d47';
  const managerId = '3c07081b-d363-486f-8099-3cc5fddcb52f';
  
  console.log('Updating Oviya to report to Hella...');
  const { data, error } = await supabaseAdmin.from('users').update({ manager_id: managerId }).eq('id', oviyaId).select().single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}
run();
