const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function check() {
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: 'hella@infosys.com',
      password: 'Welcome@123'
  });
  console.log('USER ID FROM AUTH:', user?.id);
  console.log('ERROR:', error?.message);
}

check();
