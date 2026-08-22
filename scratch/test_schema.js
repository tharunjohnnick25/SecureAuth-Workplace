const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qbeulfmjmmwcbxuzocdv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZXVsZm1qbW13Y2J4dXpvY2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxNTg1OSwiZXhwIjoyMDkzODkxODU5fQ.sshItacQKeDpXTOu68c0WssIyfqPOurMLbTFnA1-Jqs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const dummyId = '11111111-1111-1111-1111-111111111111';
  // Try to insert directly
  const { data, error } = await supabase.from('users').insert([{
    id: dummyId,
    email: 'test@example.com',
    full_name: 'Test',
    department: 'Test Dept'
  }]).select('*');
  
  if (error) {
     console.error('Error inserting:', error.message);
  } else {
     console.log('Inserted successfully!', Object.keys(data[0]));
     await supabase.from('users').delete().eq('id', dummyId);
  }
}

test().catch(console.error);
