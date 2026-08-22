const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: initial, error: initialError } = await supabaseAdmin.from('documents').select('id, name').limit(1);
  if (initial && initial.length > 0) {
    const fileId = initial[0].id;
    console.log('Target file:', fileId);
    
    // Delete it
    await supabaseAdmin.from('documents').delete().eq('id', fileId);
    
    // Check if it still exists
    const { data: check } = await supabaseAdmin.from('documents').select('*').eq('id', fileId);
    console.log('Check after delete:', check);
  } else {
    console.log('No files to test.');
  }
}
run();
