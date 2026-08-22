const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    SELECT tgname, proname 
    FROM pg_trigger 
    JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid 
    WHERE tgrelid = 'public.documents'::regclass;
  `;
  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query });
  console.log('Triggers:', data);
  console.log('Error:', error);
}
run();
