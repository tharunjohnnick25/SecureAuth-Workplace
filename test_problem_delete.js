const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const fileId = '448aecfc-5332-45b5-851e-e7ae3c7bedab';
  console.log('Target file:', fileId);
  
  // 1. Select the file
  const { data: file, error: fileError } = await supabaseAdmin.from('documents').select('*').eq('id', fileId);
  console.log('Select result:', file);
  
  // 2. Delete it with .select()
  const { data: deletedRows, error: deleteError } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', fileId)
    .select();
    
  console.log('Deleted rows:', deletedRows);
  console.log('Delete error:', deleteError);
}
run();
