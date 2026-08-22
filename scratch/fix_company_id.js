const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Creating mock company...');
  
  let { data: company, error: companyError } = await supabase.from('companies').insert({
    name: 'Infosys & TCS Alliance',
    domain: 'infosys.com'
  }).select().single();
  
  if (companyError && companyError.code === '23505') {
    console.log('Company already exists, fetching...');
    const { data } = await supabase.from('companies').select().eq('domain', 'infosys.com').single();
    company = data;
  } else if (companyError) {
    console.error('Error creating company:', companyError);
    return;
  }
  
  console.log('Company ID:', company.id);
  
  console.log('Updating all users to belong to this company...');
  const { data: users, error: usersError } = await supabase.from('users').update({
    company_id: company.id
  }).neq('id', '00000000-0000-0000-0000-000000000000').select('email, company_id');
  
  if (usersError) {
    console.error('Error updating users:', usersError);
    return;
  }
  
  console.log(`Updated ${users.length} users with company_id!`);
}

run().catch(console.error);
