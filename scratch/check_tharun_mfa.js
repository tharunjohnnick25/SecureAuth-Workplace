const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTharun() {
    const { data, error } = await supabase.from('users').select('*').eq('email', 'tharun@infosys.com').single();
    if (error) console.error(error);
    else console.log('company_id:', data.company_id, 'org_id:', data.org_id);
}
checkTharun();
