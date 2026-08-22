const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: caller } = await supabaseAdmin.from('users').select('*').eq('email', 'tharun@infosys.com').single();
  
  let q = supabaseAdmin.from('resource_requests').select(`*, users!inner (company_id)`).order('created_at', { ascending: false });
  if (caller.company_id) {
    q = q.eq('users.company_id', caller.company_id);
  }
  const { data, error } = await q;
  console.log('Tharun company_id:', caller.company_id);
  console.log('Results:', data);
  console.log('Error:', error);
}
run();
