import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const email = 'admin@test.com';
  const password = 'tharun26';

  console.log(`Creating user ${email}...`);

  // 1. Create or update Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = authData?.user?.id;

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('User already exists in auth. Fetching ID...');
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = (existingUsers as any)?.users?.find((u: any) => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        // Update password just in case
        await supabase.auth.admin.updateUserById(userId, { password });
      } else {
        console.error('Could not find existing user ID');
        return;
      }
    } else {
      console.error('Error creating auth user:', authError);
      return;
    }
  }

  if (!userId) {
    console.error('No user ID found');
    return;
  }

  // 2. Upsert into public.users table
  const { error: dbError } = await supabase.from('users').upsert({
    id: userId,
    email: email,
    full_name: 'System Admin',
    role: 'Admin',
    department_id: null,
    status: 'ACTIVE',
  });

  if (dbError) {
    console.error('Error updating public.users:', dbError);
    return;
  }

  console.log('Admin user created successfully!');
}

createAdmin();
