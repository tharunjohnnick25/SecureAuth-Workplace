const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('access_requests').select('*').limit(1);
  console.log('Access Requests Schema:', error);
  // To get columns:
  const { data: cols } = await supabaseAdmin.rpc('get_table_columns', { table_name: 'access_requests' }).catch(() => ({}));
  console.log('Columns from RPC if any:', cols);
}
run();
