const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'documents';
  `;
  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query });
  console.log('RLS Enabled?:', data);
  console.log('Error:', error);
}
run();
