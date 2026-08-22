const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testInsert() {
  const { data: users, error: userErr } = await supabaseAdmin.from('users').select('id, company_id, email').limit(1);
  if (userErr || !users || users.length === 0) {
    console.error('User fetch error:', userErr);
    return;
  }

  const user = users[0];
  console.log('Testing insert for user:', user.email, user.id);

  const { data: challenge, error: insertErr } = await supabaseAdmin
    .from('otp_challenges')
    .insert({
      user_id: user.id,
      company_id: user.company_id || null,
      phone: '+91 9876541234',
      otp_hash: 'test_hash_1234567890123456789012345678901234567890123456789012345678901234',
      purpose: 'PHONE_VERIFICATION',
      attempt_count: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('--- EXACT DB INSERT ERROR ---');
    console.error(insertErr);
  } else {
    console.log('SUCCESS! Challenge inserted:', challenge.id);
  }
}

testInsert();
