const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: oldReqs, error: err1 } = await supabaseAdmin.from('employee_requests').select('*, users!employee_requests_user_id_fkey(company_id)');
  if (err1) { console.error('Error fetching old reqs', err1); return; }

  const newReqs = oldReqs.map(req => {
    const match = (req.reason || '').match(/^\[(.*?)\]\s*-\s*(.*)$/);
    const moduleName = match ? match[1] : 'Unknown Module';
    const reason = match ? match[2] : req.reason;

    return {
      requester_id: req.user_id,
      company_id: req.users?.company_id || null,
      module: moduleName,
      reason: reason,
      status: req.status.toUpperCase(),
      created_at: req.created_at
    };
  });

  if (newReqs.length > 0) {
    const { data: inserted, error: err2 } = await supabaseAdmin.from('access_requests').insert(newReqs);
    if (err2) {
      console.error('Error inserting new reqs', err2);
    } else {
      console.log(`Migrated ${newReqs.length} requests successfully to access_requests.`);
    }
  } else {
    console.log('No requests to migrate.');
  }
}
run();
