const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('documents').select('*');
  console.log('All documents in DB:');
  if (data) {
    data.forEach(d => console.log(d.id, d.name, d.document_name));
  } else {
    console.log(error);
  }
}
run();
