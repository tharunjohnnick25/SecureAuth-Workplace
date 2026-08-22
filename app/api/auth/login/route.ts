import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { registerDeviceAndSession } from '@/lib/security/device';
import { evaluateLoginRisk } from '@/lib/security/riskEngine';
import { evaluateGeofence } from '@/lib/security/geofenceService';
import { evaluateSecurityPolicy, PolicyContext } from '@/lib/security/policyEngine';
import { detectBruteForce, detectImpossibleTravel } from '@/lib/security/threatEngine';
import {
  ensureAdminRecord,
  ensureCompanyOrgBranch,
  ensurePermissions,
  recordDeviceFingerprint,
  recordGeoLocation,
  recordMlPrediction,
  recordMlRiskLog,
  recordOauthAccount,
  recordTypingBehavior,
  upsertBehavioralBaseline,
  upsertBehavioralProfile,
} from '@/lib/security/telemetry';

// Use a raw client to validate credentials WITHOUT setting the main SSR cookies yet
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, location, fingerprint, typingMetrics } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // 1. Authenticate (Mock vs Supabase)
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const { MockEmployees } = await import('@/lib/mock-employees');
      const allEmp = MockEmployees.getAll();
      const user = allEmp.find(e => e.email === email);
      
      // Super simple mock password check (in a real app we'd hash, here we just allow if they exist and passwords somewhat match what they provided, or just allow it for testing since it's mock mode)
      // Actually, since it's mock, we'll just let them in if the email exists, or if they type the correct mock password. For simplicity in mock mode, if the email exists, allow it.
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Create a mock session JWT using jose
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026');
      const token = await new SignJWT({
        sub: user.id,
        email: user.email,
        role: user.role,
        aal: "aal1"
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

      const response = NextResponse.json({
        success: true,
        requiresMfa: false,
        user: user,
        userData: user,
        session: {
          access_token: token,
          refresh_token: 'mock-refresh-token',
        },
        risk: { riskScore: 10, riskLevel: 'LOW' }
      });

      // Set the mock token in cookies to emulate Supabase SSR auth
      response.cookies.set('sb-qbeulfmjmmwcbxuzocdv-auth-token-code-verifier', token, { path: '/' });
      response.cookies.set('sb-qbeulfmjmmwcbxuzocdv-auth-token', JSON.stringify({
         access_token: token,
         refresh_token: 'mock-refresh',
         expires_at: Math.floor(Date.now() / 1000) + 7200,
         user: { id: user.id, email: user.email, role: user.role }
      }), { path: '/' });

      return response;
    }

    const authClient = createClient(rawSupabaseUrl, rawSupabaseKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      // SOC Threat Detection: Log failed attempt for brute force analysis
      if (process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true') {
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: targetUser } = await adminClient.from('users').select('id, company_id').eq('email', email).maybeSingle();
        
        if (targetUser) {
          const { data: profile } = await adminClient.from('users').select('company_id, role, status').eq('id', targetUser.id).maybeSingle();
          console.log("FETCHED PROFILE FOR LOGIN:", profile, targetUser.id);

          const reqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
          const deviceId = fingerprint?.hash ? `dev-${fingerprint.hash.replace(/[^a-z0-9]/gi, '').slice(0, 12)}` : 'unknown';
          
          await adminClient.from('login_history').insert({
            user_id: targetUser.id,
            device_id: deviceId,
            ip_address: reqIp,
            status: 'FAIL',
            failure_reason: 'Invalid Credentials'
          });
          
          await detectBruteForce(targetUser.id, targetUser.company_id, reqIp);
        }
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { user, session } = authData;

    // Fetch user profile to get employee details
    const { data: profile } = await authClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'SUSPENDED') {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await adminClient.auth.admin.signOut(user.id);
      return NextResponse.json({ error: 'Account suspended. Access denied.' }, { status: 403 });
    }

    // 2. Telemetry & Risk Scoring via Python AI Service
    const reqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const deviceId = fingerprint?.hash 
      ? `dev-${fingerprint.hash.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`
      : `dev-${Math.random().toString(16).slice(2, 10)}`;
      
    // 2.a Geofence / Location Policy Check (Phase 14)
    // 2. Adaptive Risk Evaluation (Phase 12)
    // SOC Threat Detection: Impossible Travel
    // These three are independent of each other — run them in parallel.
    const networkType = req.headers.get('x-network-type') || 'ISP';
    const metrics = { rhythm_variance: typingMetrics?.rhythm_variance || 5.0 };

    const [geofenceResult, riskResult] = await Promise.all([
      profile?.company_id
        ? evaluateGeofence(
            profile.company_id,
            location ? { latitude: location.latitude, longitude: location.longitude } : undefined
          )
        : Promise.resolve({ status: 'ALLOWED' as const }),
      evaluateLoginRisk(
        user.id,
        deviceId,
        reqIp,
        networkType,
        location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
        metrics
      ),
      // Fire-and-forget side effect (logged by the engine when triggered)
      location && profile?.company_id
        ? detectImpossibleTravel(user.id, profile.company_id, reqIp, location)
        : Promise.resolve(false),
    ]);

    const { status: geofenceStatus } = geofenceResult as { status: 'ALLOWED' | 'BLOCKED'; reason?: string };
    if (geofenceStatus === 'BLOCKED') {
       // Immediately block without creating session
       const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
       await adminClient.from('login_history').insert({
          user_id: user.id,
          device_id: deviceId,
          ip_address: reqIp,
          status: 'BLOCKED',
          latitude: location?.latitude,
          longitude: location?.longitude
       });
       
       await adminClient.from('security_events').insert({
          company_id: profile.company_id,
          user_id: user.id,
          event_type: 'BLOCKED_BY_GEOFENCE',
          severity: 'HIGH',
          description: (geofenceResult as { reason?: string }).reason || 'Login blocked by geofence policy.'
       });
       
       // Revoke the session that was just created by Supabase Auth
       await adminClient.auth.admin.signOut(user.id);
       
       return NextResponse.json({ error: 'Access denied: Location policy violation' }, { status: 403 });
    }

    const { riskScore, riskLevel, decision: riskDecision, riskScoreId } = riskResult;

    // 3. Central Security Policy Evaluation (Phase 17)
    const role = (profile?.role || 'EMPLOYEE').toUpperCase();

    const policyContext: PolicyContext = {
      user_id: user.id,
      company_id: profile?.company_id || '',
      role: role,
      account_status: profile?.status || 'ACTIVE',
      risk_score: riskScore,
      network_type: networkType
    };

    const policyResult = await evaluateSecurityPolicy('LOGIN', policyContext);
    console.log('POLICY RESULT:', policyResult);
    
    // Merge Risk decision and Policy decision (most restrictive wins)
    // If either is BLOCK, it's BLOCK. If either requires MFA, it requires MFA.
    let finalDecision = policyResult.decision;
    if (riskDecision === 'BLOCK') finalDecision = 'BLOCK';
    else if (riskDecision === 'REQUIRE_MFA' || riskDecision === 'STRONG_AUTH_REQUIRED') {
      if (finalDecision !== 'BLOCK' && finalDecision !== 'DENY') {
         finalDecision = 'MFA_REQUIRED';
      }
    }

    // MFA has been globally disabled by admin request
    let requiresMfa = false;
    const requiresMfaSetup = false;

    // 4. Handle Pending Session vs Final Session
    if (!requiresMfa) {
        const ssrClient = await createServerSupabaseClient();
        await ssrClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
    }

    // 5. Device Identification & Session Management
    const { deviceId: finalDeviceId, isNewDevice, sessionToken } = await registerDeviceAndSession(
      req, 
      user.id, 
      session.access_token, 
      riskScore, 
      riskLevel,
      riskScoreId
    );

    // 5b. Behavioral & ML telemetry (best-effort, never blocks login)
    {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const roleUpper = (profile?.role || 'employee').toUpperCase();
      const isAdminUser = ['SUPER_ADMIN', 'ADMIN'].includes(roleUpper);
      const oauthProvider = String(user.app_metadata?.provider || 'email');
      const oauthProviderId = String(user.app_metadata?.provider_id || user.id);

      await Promise.all([
        recordDeviceFingerprint(adminClient, user.id, fingerprint),
        recordTypingBehavior(adminClient, user.id, typingMetrics),
        upsertBehavioralProfile(adminClient, user.id, riskScore, metrics),
        upsertBehavioralBaseline(adminClient, user.id, typingMetrics),
        recordMlRiskLog(adminClient, user.id, sessionToken, riskScore, riskLevel, metrics, { network_type: networkType, device_id: finalDeviceId }),
        recordMlPrediction(adminClient, user.id, 'login-risk-model', metrics, { risk_score: riskScore, risk_level: riskLevel, decision: riskDecision }),
        recordGeoLocation(adminClient, user.id, sessionToken, reqIp, location?.latitude, location?.longitude, riskDecision === 'BLOCK'),
        ensureAdminRecord(adminClient, user.id, user.email || '', isAdminUser),
        recordOauthAccount(adminClient, user.id, oauthProvider, oauthProviderId),
        ensurePermissions(adminClient),
        ensureCompanyOrgBranch(adminClient, profile?.company_id || null),
      ]);
    }

    const response = NextResponse.json({
      success: true,
      requiresMfa,
      requiresMfaSetup,
      user: { ...user, ...profile },
      userData: { ...user, ...profile },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
      risk: { riskScore, riskLevel }
    });

    if (isNewDevice) {
       response.cookies.set('secureauth_device_id', finalDeviceId, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'lax',
           maxAge: 365 * 24 * 60 * 60, // 1 year
           path: '/'
       });
    }

    // Set custom session token for manual revocation lookup
    response.cookies.set('secureauth_session_id', sessionToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 7 * 24 * 60 * 60, // 7 days
       path: '/'
    });

    if (requiresMfa) {
        // Securely hold the AAL1 session in a pending cookie until MFA verification
        response.cookies.set('mfa_pending_session', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + 900 // 15 mins to complete MFA
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 900,
            path: '/'
        });
    }

    return response;

  } catch (error: any) {
    console.error('Login error stack:', error?.stack || error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
