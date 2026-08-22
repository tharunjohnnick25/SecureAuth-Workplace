import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase.from('users').select('id, email, passkey_enabled, totp_enabled, is_mfa_enabled, mfa_secret');
  console.log("Users:", JSON.stringify(users, null, 2));

  const { data: passkeys } = await supabase.from('passkeys').select('*');
  console.log("Passkeys:", JSON.stringify(passkeys, null, 2));
}

checkData().catch(console.error);
