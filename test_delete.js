const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('documents').select('id').limit(1);
  if (data && data.length > 0) {
    console.log('Attempting to delete file:', data[0].id);
    const delRes = await supabaseAdmin.from('documents').delete().eq('id', data[0].id);
    console.log('Delete result:', delRes);
  } else {
    console.log('No files found.');
  }
}
run();
