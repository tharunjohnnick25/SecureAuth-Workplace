import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { error } = await supabase.rpc('admin_exec_sql', {
    sql_string: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passkey_enabled BOOLEAN DEFAULT FALSE;'
  });
  if (error) {
     console.error("Failed to run SQL via RPC, trying direct...", error);
  } else {
     console.log("Migration successful!");
  }
}
run();
