const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Fetch existing requests
  const { data: oldReqs, error: err1 } = await supabaseAdmin.from('employee_requests').select('*, users!employee_requests_user_id_fkey(company_id)');
  if (err1) { console.error('Error fetching old reqs', err1); return; }

  const newReqs = oldReqs.map(req => {
    const match = (req.reason || '').match(/^\[(.*?)\]\s*-\s*(.*)$/);
    const resource_name = match ? match[1] : 'Unknown Resource';
    const reason = match ? match[2] : req.reason;

    return {
      id: req.id,
      user_id: req.user_id,
      company_id: req.users?.company_id || null,
      resource_name: resource_name,
      access_level: 'Standard',
      reason: reason,
      status: req.status.toUpperCase(),
      created_at: req.created_at,
      updated_at: req.updated_at
    };
  });

  if (newReqs.length > 0) {
    const { data: inserted, error: err2 } = await supabaseAdmin.from('resource_requests').upsert(newReqs);
    if (err2) {
      console.error('Error inserting new reqs', err2);
    } else {
      console.log(`Migrated ${newReqs.length} requests successfully.`);
    }
  } else {
    console.log('No requests to migrate.');
  }
}
run();
