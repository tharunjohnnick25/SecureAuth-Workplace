try { process.loadEnvFile('.env.local'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = ['alerts', 'risk_scores', 'security_events', 'login_history', 'audit_logs', 'threat_logs', 'office_access_logs', 'sessions', 'access_requests', 'leave_requests', 'telemetry', 'notifications', 'approval_requests', 'users', 'tasks'];
(async () => {
  for (const t of tables) {
    const { count, error } = await client.from(t).select('id', { count: 'exact', head: true });
    console.log(t.padEnd(22), error ? 'ERR ' + error.message : (count ?? 0));
  }
})();
