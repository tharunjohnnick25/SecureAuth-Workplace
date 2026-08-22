const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function provision() {
  const targetEmails = [
    'tharun@infosys.com',
    'hella@infosys.com',
    'vicky@infosys.com',
    'rajesh@infosys.com',
    'tharun@tcs.com',
    'john@tcs.com',
    'e2e.admin.a@test.local',
    'e2e.manager@test.local',
    'e2e.emp1@test.local'
  ];

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  for (const email of targetEmails) {
    const user = authUsers.users.find(u => u.email === email);
    if (user) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password: 'Welcome@123' });
      console.log(`[PROVISIONED] Password for ${email} set to Welcome@123`);
    }
  }
}

provision();
