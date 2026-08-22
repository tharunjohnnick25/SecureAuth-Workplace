import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetUserId = 'bbd21573-80a4-4a26-9201-603d79540d47';
  
  const updatePayload = {
      phone: "1234567890",
      date_of_birth: "2000-01-01",
      gender: "Male",
      blood_group: "O+"
  };

  const { error } = await supabase.from('users').update(updatePayload).eq('id', targetUserId);
  if (error) {
      console.error("Update error:", error);
  } else {
      console.log("Update success!");
  }
}

run();
