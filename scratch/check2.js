try { process.loadEnvFile('.env.local'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await client.from('tasks').select('*').limit(1);
  if (error) console.log('tasks ERR', error.message);
  else console.log('tasks cols:', data.length ? Object.keys(data[0]).join(',') : 'empty');
  const { data: u } = await client.from('users').select('id, role').limit(1);
  console.log('users sample:', u ? JSON.stringify(u[0]) : 'null');
})();
