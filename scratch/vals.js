try { process.loadEnvFile('.env.local'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  for (const [t, col] of [['security_events','severity'],['security_events','status'],['security_events','event_type'],['login_history','status'],['risk_scores','risk_level'],['risk_scores','score']]) {
    const { data, error } = await client.from(t).select(col).limit(200);
    if (error) { console.log(t,col,'ERR',error.message); continue; }
    const counts = {};
    (data||[]).forEach(r => { const v = r[col]; counts[v] = (counts[v]||0)+1; });
    console.log(t+'.'+col, JSON.stringify(counts));
  }
  const { data: ev } = await client.from('security_events').select('event_type, created_at').order('created_at',{ascending:false}).limit(5);
  console.log('sample events:', JSON.stringify(ev));
  const { data: lh } = await client.from('login_history').select('status, created_at').order('created_at',{ascending:false}).limit(5);
  console.log('sample logins:', JSON.stringify(lh));
})();
