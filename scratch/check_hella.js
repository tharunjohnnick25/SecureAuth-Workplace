const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUser() {
  const { data, error } = await supabase.from('users').select('email, company_id, role, status').eq('email', 'hella@infosys.com').single();
  console.log(data, error);
}

checkUser();
