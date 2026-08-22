const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function verify() {
  console.log('--- Verifying Data in public.users ---');
  const { data, error } = await supabase.from('users').select('id, email, full_name, role, department, manager_id');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.table(data);

  console.log('\n--- Checking manager links ---');
  data.forEach(user => {
      if (user.manager_id) {
          const manager = data.find(m => m.id === user.manager_id);
          console.log(`User ${user.email} is managed by ${manager ? manager.email : 'Unknown'}`);
      } else {
          console.log(`User ${user.email} has no manager (top-level)`);
      }
  });
}

verify().catch(console.error);
