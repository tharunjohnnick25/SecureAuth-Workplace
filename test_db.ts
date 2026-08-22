import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase1() {
  const sqlString = fs.readFileSync('./database/phase1_schema.sql', 'utf8');
  console.log('Executing Phase 1 SQL schema...');
  const { data: sqlData, error: sqlError } = await supabase.rpc('admin_exec_sql', { query: sqlString });
  
  if (sqlError) {
    console.error('Error executing SQL:', sqlError);
  } else {
    console.log('SQL executed successfully!');
  }
}

setupPhase1();
