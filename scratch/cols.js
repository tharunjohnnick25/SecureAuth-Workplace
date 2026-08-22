try { process.loadEnvFile('.env.local'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = ['security_events', 'risk_scores', 'login_history', 'audit_logs', 'sessions'];
(async () => {
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) { console.log(t, 'ERR', error.message); continue; }
    console.log('\n==', t, '==');
    console.log(Object.keys(data[0] || {}).join(', '));
  }
})();
