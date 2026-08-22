const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function cleanup() {
  const { data, error } = await supabase.from('users').select('id').eq('email', 'test_trigger@infosys.com').single();
  if (data) {
      await supabase.auth.admin.deleteUser(data.id);
      console.log('Cleaned up test_trigger@infosys.com');
  }
}

cleanup().catch(console.error);
