import { NextRequest } from 'next/server';

export interface DeviceInfo {
    browser: string;
    os: string;
    device_type: string;
}

export function parseUserAgent(ua: string): DeviceInfo {
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device_type = 'desktop';

    if (!ua) return { browser, os, device_type };

    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
        device_type = 'mobile';
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
        device_type = 'tablet';
    }

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome') || ua.includes('CriOS')) browser = 'Chrome';
    else if (ua.includes('Firefox') || ua.includes('FxiOS')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';

    return { browser, os, device_type };
}

export function getClientIp(req: NextRequest) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

export function getDeviceCookie(req: NextRequest) {
    return req.cookies.get('secureauth_device_id')?.value;
}

export async function registerDeviceAndSession(
    req: NextRequest, 
    userId: string, 
    accessToken: string, 
    riskScore: number = 0, 
    riskLevel: string = 'low',
    riskScoreId?: string | null
) {
    const { createClient } = await import('@supabase/supabase-js');
    const crypto = await import('crypto');
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const uaString = req.headers.get('user-agent') || '';
    const { browser, os, device_type } = parseUserAgent(uaString);
    const reqIp = getClientIp(req);
    let deviceIdCookie = getDeviceCookie(req);
    let isNewDevice = false;
    let deviceId = deviceIdCookie;

    if (deviceId) {
       const { error } = await adminClient.from('devices')
           .update({ last_active: new Date().toISOString() })
           .eq('id', deviceId)
           .eq('user_id', userId);
       if (error) deviceId = undefined; 
    }

    if (!deviceId) {
       deviceId = crypto.randomUUID();
       isNewDevice = true;
       await Promise.all([
          adminClient.from('devices').insert({
             id: deviceId,
             user_id: userId,
             device_type,
             os,
             browser,
             ip_address: reqIp,
             is_trusted: false
          }),
          adminClient.from('security_events').insert({
             user_id: userId,
             event_type: 'NEW_DEVICE_DETECTED',
             severity: 'medium',
             ip_address: reqIp,
             details: { os, browser, device_type }
          })
       ]);
    }

    const sessionToken = crypto.createHash('sha256').update(accessToken).digest('hex');

    // Independent inserts — run in parallel
    await Promise.all([
      adminClient.from('sessions').insert({
        user_id: userId,
        device_id: deviceId,
        session_token: sessionToken,
        ip_address: reqIp,
        user_agent: uaString,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
      adminClient.from('login_history').insert({
        user_id: userId,
        device_id: deviceId,
        ip_address: reqIp,
        browser,
        os,
        status: 'SUCCESS',
        risk_score: riskScore,
        risk_level: riskLevel,
        ...(riskScoreId ? { risk_score_id: riskScoreId } : {})
      })
    ]);

    return { deviceId, isNewDevice, sessionToken };
}
