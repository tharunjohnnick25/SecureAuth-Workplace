const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "hella@infosys.com", password: "Welcome@123", role: "manager" },
  { email: "john@tcs.com", password: "tharun26", role: "employee" },
  { email: "prashanth@tcs.com", password: "tharun26", role: "employee" },
  { email: "praveen@tcs.com", password: "Welcome@123", role: "employee" },
  { email: "rajesh@infosys.com", password: "Welcome@123", role: "employee" },
  { email: "tharun@infosys.com", password: "tharun26", role: "admin" },
  { email: "tharun@tcs.com", password: "tharun26", role: "super_admin" },
  { email: "vicky@infosys.com", password: "helloeveryone", role: "employee" }
];

async function findUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const found = (data?.users || []).find(
    (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
  );
  return found?.id || null;
}

async function run() {
  console.log('Importing users and updating passwords...');

  for (const user of users) {
    let userId = await findUserIdByEmail(user.email);
    
    if (userId) {
      // User exists, just update their password
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: user.password
      });
      if (error) {
        console.error(`Error updating password for ${user.email}:`, error.message);
      } else {
        console.log(`Updated password for existing user: ${user.email}`);
      }
    } else {
      // User doesn't exist, create them
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });
      
      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
        continue;
      }
      
      userId = data.user.id;
      console.log(`Created new user: ${user.email}`);
      
      // Update their role in public.users
      const { error: profileError } = await supabase.from('users').update({
        role: user.role
      }).eq('id', userId);
      
      if (profileError) {
        console.error(`Error updating role for ${user.email}:`, profileError.message);
      }
    }
  }
  
  console.log('Import complete!');
}

run().catch(console.error);
