const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = `
    DROP POLICY IF EXISTS "Public Access Employee Docs" ON storage.objects;
    CREATE POLICY "Public Access Employee Docs" ON storage.objects FOR ALL USING ( bucket_id = 'employee-documents' ) WITH CHECK ( bucket_id = 'employee-documents' );
  `;
  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query: sql });
  console.log('Result:', data, 'Error:', error);
}
run();
