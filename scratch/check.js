try { process.loadEnvFile('.env.local'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await client.from('approval_requests').select('id, status').limit(5);
  console.log('approval_requests:', error ? ('ERR ' + error.message) : JSON.stringify(data));
  const { data: s } = await client.from('sessions').select('id, company_id, is_active').limit(3);
  console.log('sessions sample:', s ? JSON.stringify(s) : 'null');
})();
