const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qbeulfmjmmwcbxuzocdv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZXVsZm1qbW13Y2J4dXpvY2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxNTg1OSwiZXhwIjoyMDkzODkxODU5fQ.sshItacQKeDpXTOu68c0WssIyfqPOurMLbTFnA1-Jqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').eq('email', 'test_trigger@infosys.com');
  console.log('User in public.users:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test().catch(console.error);
