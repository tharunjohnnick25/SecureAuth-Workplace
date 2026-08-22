import { createClient } from '@supabase/supabase-js';

export interface RiskEngineResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  decision: 'ALLOW' | 'REQUIRE_MFA' | 'STRONG_AUTH_REQUIRED' | 'BLOCK';
  riskScoreId: string;
}

export async function evaluateLoginRisk(
  userId: string,
  deviceId: string,
  reqIp: string,
  networkType: string,
  location?: { latitude: number; longitude: number },
  typingMetrics?: { rhythm_variance: number }
): Promise<RiskEngineResult> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Context Collection — parallel queries (independent of each other)
    const [devicesRes, historyRes, failedLoginsRes] = await Promise.all([
      adminClient.from('devices').select('id').eq('user_id', userId),
      adminClient
        .from('login_history')
        .select('created_at, latitude, longitude, status')
        .eq('user_id', userId)
        .eq('status', 'SUCCESS')
        .order('created_at', { ascending: false })
        .limit(10),
      adminClient
        .from('login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'FAILED')
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()), // Last 15 mins
    ]);

    const devicesData = devicesRes.data;
    const historyData = historyRes.data;
    const failedLogins = failedLoginsRes.data;

    const known_device_ids = (devicesData || []).map(d => d.id);

    let last_login_timestamp = null;
    let last_login_location = null;
    let typical_login_hour = 9.0;

    if (historyData && historyData.length > 0) {
      const lastLogin = historyData[0];
      last_login_timestamp = lastLogin.created_at;
      if (lastLogin.latitude && lastLogin.longitude) {
        last_login_location = {
          latitude: lastLogin.latitude,
          longitude: lastLogin.longitude
        };
      }

      // Calculate typical login hour (simple average)
      const hours = historyData.map(h => {
        const d = new Date(h.created_at);
        return d.getUTCHours() + (d.getUTCMinutes() / 60.0);
      });
      typical_login_hour = hours.reduce((a, b) => a + b, 0) / hours.length;
    }

    const payload = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      ip_address: reqIp,
      location: location || { latitude: 37.7749, longitude: -122.4194 },
      device_id: deviceId,
      device_is_corporate: true, 
      device_is_compliant: true,
      network_type: networkType,
      typing_anomaly_score: typingMetrics?.rhythm_variance || 5.0,
      profile: {
        user_id: userId,
        last_login_timestamp: last_login_timestamp,
        last_login_location: last_login_location,
        known_device_ids: known_device_ids,
        typical_login_hour: typical_login_hour
      }
    };

    let riskScore = 60.0;
    let action = 'CHALLENGE';
    let factors = {};

    // 2. Call the Python AI Risk Service
    try {
      const riskResponse = await fetch('http://127.0.0.1:8000/api/v1/risk-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-risk-key-2026'
        },
        body: JSON.stringify(payload),
        // Important: Set a timeout or rely on default fetch behavior, but we want it to be fast.
        signal: AbortSignal.timeout(1500) 
      });

      if (riskResponse.ok) {
        const riskData = await riskResponse.json();
        riskScore = riskData.ai_risk_score || riskData.final_score; 
        action = riskData.action;
        
        factors = {
           ...riskData.factors,
           anomaly_score: riskData.anomaly_score,
           confidence: riskData.confidence,
           model_version: riskData.model_version,
           signals: riskData.signals
        };
      } else {
        console.warn('Risk service returned error:', await riskResponse.text());
        // Fallback to FAIL-SECURE
        factors = { error: 'Risk service error, failing securely', model_version: 'fallback' };
      }
    } catch (fetchErr) {
      console.warn('Failed to connect to Risk Service:', fetchErr);
      factors = { error: 'Risk service unavailable, failing securely', model_version: 'fallback' };
    }

    // Determine Risk Level string
    let riskLevel: 'low' | 'medium' | 'high' = 'high';
    if (riskScore <= 30) riskLevel = 'low';
    else if (riskScore <= 70) riskLevel = 'medium';

    // Map Action to our Decisions
    let decision: RiskEngineResult['decision'] = 'BLOCK';
    if (action === 'ALLOW') decision = 'ALLOW';
    else if (action === 'CHALLENGE') decision = 'REQUIRE_MFA';
    else if (action === 'BLOCK') decision = 'BLOCK';

    // Check recent failure rate (Fail-Safe heuristic inside Next.js)
    if (failedLogins && failedLogins.length >= 5) {
      decision = 'BLOCK';
      riskScore = 100;
      riskLevel = 'high';
      factors = { ...factors, override: 'Too many recent failed logins' };
    }

    // 3. Insert Risk Score record
    const { data: insertedRisk, error: insertError } = await adminClient
      .from('risk_scores')
      .insert({
        user_id: userId,
        score: riskScore,
        risk_level: riskLevel,
        factors: factors
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to log risk score:', insertError);
    }

    return {
      riskScore,
      riskLevel,
      decision,
      riskScoreId: insertedRisk?.id || null
    };
  } catch (error) {
    console.error('Error in evaluateLoginRisk:', error);
    // FAIL-SECURE fallback
    return {
      riskScore: 75,
      riskLevel: 'high',
      decision: 'REQUIRE_MFA',
      riskScoreId: 'fallback'
    };
  }
}
