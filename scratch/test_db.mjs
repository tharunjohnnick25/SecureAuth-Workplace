import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qbeulfmjmmwcbxuzocdv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZXVsZm1qbW13Y2J4dXpvY2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxNTg1OSwiZXhwIjoyMDkzODkxODU5fQ.sshItacQKeDpXTOu68c0WssIyfqPOurMLbTFnA1-Jqs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('documents').select('*');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

main();
