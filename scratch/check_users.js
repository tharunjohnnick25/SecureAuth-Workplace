const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('--- SUPABASE AUTH USERS ---');
  authUsers.users.forEach(u => {
    console.log(`Email: ${u.email} | ID: ${u.id} | Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
  });

  const { data: publicUsers, error: dbErr } = await supabase.from('users').select('email, role, status');
  console.log('--- PUBLIC.USERS ---');
  console.log(publicUsers);
}

check();
