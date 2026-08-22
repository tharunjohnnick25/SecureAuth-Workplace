const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: inserted, error: insertError } = await supabaseAdmin.from('documents').insert({
    name: 'test_delete_doc',
    document_name: 'test_delete_doc',
    user_id: '862b7997-36fb-485f-ab7f-44a733d2789e'
  }).select().single();
  
  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  
  console.log('Inserted doc:', inserted.id);
  
  const { data: deletedRows, error: deleteError } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', inserted.id)
    .select();
    
  console.log('Deleted rows:', deletedRows);
  console.log('Delete error:', deleteError);
}
run();
