import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccessRequestWithPersistence } from '@/ai-engine/server';
import { type DeviceFingerprintDetails, type KeystrokeEvent } from '@/ai-engine';

const parseBrowser = (userAgent: string) => {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome\//i.test(userAgent) && !/Chromium\//i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  if (/Opera\//i.test(userAgent) || /OPR\//i.test(userAgent)) return 'Opera';
  return 'Unknown';
};

const parseOS = (userAgent: string) => {
  if (/Windows NT/i.test(userAgent)) return 'Windows';
  if (/Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
};

const normalizeKeystrokes = (patterns: any[]): KeystrokeEvent[] => {
  let timeCursor = 0;
  return patterns
    .filter(Boolean)
    .map((pattern: any) => {
      const dwellTime = Number(pattern.dwellTime) || 0;
      const flightTime = Number(pattern.flightTime) || 0;
      const event: KeystrokeEvent = {
        key: pattern.key || 'a',
        pressTime: timeCursor,
        releaseTime: timeCursor + dwellTime,
        dwellTime,
        flightTime,
      };
      timeCursor += dwellTime + flightTime;
      return event;
    });
};

export async function POST(req: NextRequest) {
  try {
    const { email, password, fingerprint, typingMetrics, location } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Mock auth for local dev — bypasses Supabase
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return NextResponse.json({
        user: {
          id: crypto.randomUUID(),
          email,
          role: 'ADMIN',
          first_name: email.split('@')[0],
          last_name: 'User'
        },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
        riskReport: { score: 0, level: 'LOW', action: 'ALLOW', factors: [], recommendations: [] }
      });
    }

    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || 'Invalid credentials' }, { status: 401 });
    }

    const user = authData.user;

    const [deviceRes, loginLogsRes, profileRes, riskHistoryRes] = await Promise.all([
      supabase.from('devices').select('*').eq('user_id', user.id),
      supabase.from('login_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('behavioral_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('ai_risk_scores').select('*').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(20)
    ]);

    const trustedDevices = Array.isArray(deviceRes.data) ? deviceRes.data.map((device: any) => device.device_id).filter(Boolean) : [];
    const loginLogs = Array.isArray(loginLogsRes.data) ? loginLogsRes.data : [];
    const behavioralProfile = profileRes.data || null;
    const historicalRisk = Array.isArray(riskHistoryRes.data) ? riskHistoryRes.data : [];

    const deviceFingerprint: DeviceFingerprintDetails = {
      userAgent: fingerprint?.userAgent || req.headers.get('user-agent') || '',
      browser: fingerprint?.browser || parseBrowser(fingerprint?.userAgent || req.headers.get('user-agent') || ''),
      os: fingerprint?.os || parseOS(fingerprint?.userAgent || req.headers.get('user-agent') || ''),
      screenResolution: fingerprint?.screenResolution || '',
      timezone: fingerprint?.timezone || '',
      language: fingerprint?.language || '',
      gpu: fingerprint?.gpu || undefined,
      memory: fingerprint?.deviceMemory || undefined,
      cores: fingerprint?.hardwareConcurrency || undefined,
      canvasHash: fingerprint?.canvasHash || undefined,
    };

    let deviceRowId: string | null = null;
    try {
      if (fingerprint?.hash) {
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('*')
          .eq('user_id', user.id)
          .eq('device_id', fingerprint.hash)
          .maybeSingle();

        if (!existingDevice) {
          const { data: insertedDevice, error: insertError } = await supabase
            .from('devices')
            .insert({
              user_id: user.id,
              device_id: fingerprint.hash,
              browser: deviceFingerprint.browser,
              os: deviceFingerprint.os,
              is_trusted: false,
              last_active: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError) {
            console.warn('Device insert failed:', insertError);
          }

          deviceRowId = insertedDevice?.id ?? null;
        } else {
          deviceRowId = existingDevice.id;
          await supabase.from('devices').update({
            last_active: new Date().toISOString()
          }).eq('id', existingDevice.id);
        }
      }
    } catch (err) {
      console.warn('Device tracking failed:', err);
    }

    const keystrokes = Array.isArray(typingMetrics) ? normalizeKeystrokes(typingMetrics) : [];
    const recentLogins = loginLogs.map((log: any) => ({
      timestamp: log.created_at,
      user_id: user.id,
      ip: log.ip_address || '0.0.0.0',
      action: 'login_attempt',
      success: log.status === 'SUCCESS',
      userAgent: log.user_agent || log.browser || '',
      location: typeof log.location === 'object' ? log.location : undefined,
    }));

    const recentRiskHistory = historicalRisk.map((record: any) => {
      const factors = Array.isArray(record.factors) ? record.factors : [];
      return {
        score: record.score,
        anomalyDetected: record.risk_level === 'HIGH' || record.risk_level === 'CRITICAL',
        failedMfa: factors.some((factor: any) => factor?.code === 'FAILED_LOGINS'),
        unrecognizedDevice: factors.some((factor: any) => factor?.code === 'NEW_DEVICE')
      };
    });

    const lastLogin = loginLogs[0];
    const lastLocation = (lastLogin?.location && typeof lastLogin.location === 'object') ? lastLogin.location : null;
    const lastLatitude = lastLocation?.latitude ?? null;
    const lastLongitude = lastLocation?.longitude ?? null;

    const context = {
      userId: user.id,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0',
      userAgent: deviceFingerprint.userAgent,
      fingerprint: deviceFingerprint,
      keystrokes,
      location: {
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        city: location?.city || 'Unknown',
        country: location?.country || 'Unknown'
      },
      history: {
        lastIp: lastLogin?.ip_address || null,
        lastLogin: lastLogin?.created_at || null,
        lastLatitude,
        lastLongitude,
        trustedDevices,
        recentLogins,
        recentRiskHistory,
        failedAttemptsCount: loginLogs.filter((log: any) => log.status === 'FAILURE').length,
        mfaEnabled: Boolean(user.user_metadata?.is_mfa_enabled ?? user.is_mfa_enabled),
        passwordAgeDays: Math.floor((Date.now() - new Date(user.updated_at || user.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      },
      baselines: {
        typingProfile: behavioralProfile?.typing_baseline ?? null,
        outlierCentroid: behavioralProfile?.login_patterns?.centroid ?? null,
        officeGeofences: behavioralProfile?.login_patterns?.officeGeofences ?? undefined,
      }
    };

    const evaluation = await evaluateAccessRequestWithPersistence(context, supabase);

    const sessionToken = authData.session?.access_token || authData.session?.refresh_token || '';
    await Promise.all([
      supabase.from('login_history').insert({
        user_id: user.id,
        device_id: deviceRowId,
        ip_address: context.ip,
        browser: deviceFingerprint.browser,
        os: deviceFingerprint.os,
        status: evaluation.riskReport.action === 'ALLOW' ? 'success' : evaluation.riskReport.action === 'BLOCK' ? 'failed' : 'challenge',
        failure_reason: evaluation.riskReport.action === 'BLOCK' ? evaluation.riskReport.recommendations?.join(', ') || 'Risk blocked by SecureAuth' : null,
        risk_score: evaluation.riskReport.score,
        risk_level: evaluation.riskReport.level,
        city: context.location.city,
        country: context.location.country,
        created_at: new Date().toISOString(),
      } as any),
      supabase.from('sessions').insert({
        user_id: user.id,
        device_id: deviceRowId,
        session_token: sessionToken,
        ip_address: context.ip,
        user_agent: deviceFingerprint.userAgent,
        is_active: evaluation.riskReport.action === 'ALLOW',
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as any),
      supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'login_attempt',
        resource: 'auth.login',
        details: {
          risk_report: evaluation.riskReport,
          trusted_device: trustedDevices.includes(fingerprint?.hash || ''),
        },
        ip_address: context.ip,
        created_at: new Date().toISOString(),
      } as any),
    ]);

    if (evaluation.riskReport.action === 'BLOCK') {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Access blocked by SecureAuth risk engine', riskReport: evaluation.riskReport }, { status: 403 });
    }

    const userProfile = {
      id: user.id,
      email: user.email,
      role: (behavioralProfile?.role ?? 'employee') as string,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || ''
    };

    if (evaluation.riskReport.action !== 'ALLOW') {
      return NextResponse.json({
        requiresBiometric: true,
        riskLevel: evaluation.riskReport.level,
        action: evaluation.riskReport.action,
        recommendations: evaluation.riskReport.recommendations,
        user: userProfile,
        session: authData.session,
      });
    }

    return NextResponse.json({
      user: userProfile,
      session: authData.session,
      riskReport: evaluation.riskReport
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
