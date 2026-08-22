const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function check() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'hella@infosys.com',
      password: 'Welcome@123'
  });
  
  const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${session?.access_token}` } }
  });

  const { data: profile, error } = await authClient
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
  console.log('PROFILE:', profile);
  console.log('ERROR:', error);
}

check();
