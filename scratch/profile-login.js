const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const HELLA = '3c07081b-d363-486f-8099-3cc5fddcb52f';
const COMPANY = '4dddf0d5-d6e5-43dc-8fd2-03d5a91bf031';

async function time(label, fn) {
  const s = Date.now();
  try { await fn(); } catch (e) { console.log(`${label}: ERROR ${e.message}`); }
  console.log(`${label}: ${Date.now() - s}ms`);
}

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  await time('AI risk service (down)', async () => {
    try {
      const r = await fetch('http://127.0.0.1:8000/api/v1/risk-score', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-risk-key-2026' }, body: '{}', signal: AbortSignal.timeout(1500) });
      await r.json();
    } catch {}
  });

  await time('devices query', async () => { await admin.from('devices').select('id').eq('user_id', HELLA); });
  await time('login_history query', async () => { await admin.from('login_history').select('id').eq('user_id', HELLA).limit(1); });
  await time('failed logins query', async () => { await admin.from('login_history').select('id').eq('user_id', HELLA).eq('status', 'FAILED').limit(1); });
  await time('risk_scores insert', async () => { await admin.from('risk_scores').insert({ user_id: HELLA, score: 60, risk_level: 'medium', factors: {} }).select('id').single(); });
  await time('security_policies query', async () => { await admin.from('security_policies').select('*').eq('company_id', COMPANY).eq('action', 'LOGIN').eq('is_active', true); });
  await time('geofences query', async () => { await admin.from('geofences').select('*').eq('company_id', COMPANY).eq('is_active', true); });
  await time('sessions insert', async () => { await admin.from('sessions').insert({ user_id: HELLA, session_token: 'prof-' + Date.now(), ip_address: '127.0.0.1', user_agent: 'profile' }).select('id').single(); });
  await time('login_history insert', async () => { await admin.from('login_history').insert({ user_id: HELLA, ip_address: '127.0.0.1', status: 'SUCCESS' }).select('id').single(); });
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });

