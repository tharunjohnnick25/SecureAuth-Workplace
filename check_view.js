const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    SELECT table_type 
    FROM information_schema.tables 
    WHERE table_name = 'documents';
  `;
  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query });
  console.log('Is View:', data);
  console.log('Error:', error);
}
run();
