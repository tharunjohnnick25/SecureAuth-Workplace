const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'hella@infosys.com');
  console.log('AUTH ID:', authUser?.id);
  
  const { data: publicUser } = await supabase.from('users').select('id, email, company_id').eq('email', 'hella@infosys.com').single();
  console.log('PUBLIC ID:', publicUser?.id);
  console.log('MATCH:', authUser?.id === publicUser?.id);
}

check();
