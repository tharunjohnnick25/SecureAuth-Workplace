import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('employee_requests').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

run();
