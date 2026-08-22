const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function applyMigration() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '036_totp_and_sms_mfa.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Applying migration 036_totp_and_sms_mfa.sql to live Supabase database...');

  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query: sql });

  if (error) {
    console.error('Migration RPC error:', error);
  } else {
    console.log('SUCCESS! Migration 036 applied successfully to live database.');
  }
}

applyMigration();
