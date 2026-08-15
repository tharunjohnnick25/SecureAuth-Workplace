import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees, verifyPassword, forceReload, isProfileComplete, ADMIN_ROLES, isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { getCompanyByDomain } from '@/lib/companies';
import crypto from 'crypto';

export const DEFAULT_ADMIN_PASSWORD = 'Welcome@123';

/**
 * POST /api/auth/login
 *
 * Adaptive MFA (Risk-Based Authentication) login.
 *  1. Verifies credentials against the persisted mock employee store.
 *  2. Collects risk signals (device, geo, time, behavior, network).
 *  3. Scores the attempt 0–100 and maps it to an MFA requirement:
 *       low    → seamless (no extra factor)
 *       medium → TOTP
 *       high   → FIDO2 hardware key, or blocked
 */
export async function POST(req: NextRequest) {
  forceReload();
  try {
    const {
      email,
      employee_id,
      password,
      company_id,
      company_name,
      company_domain,
      company_country,
      fingerprint,
      typingMetrics,
      location,
      network,
      simulatedRisk,
    } = await req.json();

    const company = company_id
      ? { company_id, company_name, company_domain, company_country }
      : {};

    // ── 1. Credential verification ─────────────────────────────────────────
    const emailLower = String(email || '').toLowerCase().trim();
    const companyByDomain = getCompanyByDomain(emailLower.split('@')[1]);
    // Every registered company's admin logs in as admin@<company-domain>.
    const isCompanyAdminLogin = !!companyByDomain && emailLower === `admin@${companyByDomain.domain}`;

    let record = MockEmployees.findForLogin(email, employee_id);

    // Auto-provision the company admin on their first login using the default
    // password, then force a password change before they reach the dashboard.
    if (!record && isCompanyAdminLogin) {
      if (password !== DEFAULT_ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      record = MockEmployees.add({
        email: emailLower,
        full_name: 'Admin',
        role: 'ORGANIZATION_ADMIN',
        department: 'Security',
        designation: 'Company Administrator',
        password: DEFAULT_ADMIN_PASSWORD,
        must_change_password: true,
      }) as unknown as ReturnType<typeof MockEmployees.findForLogin>;
    } else if (!record && (email === 'admin@test' || email === 'manager@test' || email === 'tharun@infosys.com')) {
      // Handle the explicitly requested test accounts; persist them so risk
      // history (last login, trusted devices) survives across attempts.
      const role = (email === 'admin@test' || email === 'tharun@infosys.com') ? 'ADMIN' : 'MANAGER';
      if (password !== 'tharun26') {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      record = MockEmployees.add({
        email,
        full_name: email === 'admin@test' ? 'Admin User' : (email === 'tharun@infosys.com' ? 'Tharun Infosys' : 'Manager'),
        role,
        employee_id: email === 'admin@test' ? 'EMP-ADMIN01' : (email === 'tharun@infosys.com' ? 'EMP-THARUN01' : 'EMP-MGR01'),
        department: email === 'admin@test' || email === 'tharun@infosys.com' ? 'Security' : 'Engineering',
        password: 'tharun26',
      }) as unknown as ReturnType<typeof MockEmployees.findForLogin>;
    } else if (!record || !record.password_hash || !verifyPassword(password || '', record.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const userData = {
      id: record.id,
      email: record.email,
      role: record.role,
      first_name: (record.full_name || email || 'User').split(' ')[0],
      last_name: (record.full_name || '').split(' ').slice(1).join(' ') || 'User',
      employee_id: record.employee_id || 'EMP-MOCK01',
      phone: record.phone || '',
      department: record.department || '',
      designation: record.designation || '',
      employment_type: record.employment_type || '',
      date_of_joining: record.date_of_joining || '',
      date_of_birth: record.date_of_birth || '',
      gender: record.gender || '',
      emergency_contact_name: record.emergency_contact_name || '',
      emergency_contact_phone: record.emergency_contact_phone || '',
      profile_completed: ADMIN_ROLES.has(String(record.role || '').toUpperCase()) || isProfileComplete(record),
      passkey_enrolled: record.passkey_enrolled === true,
      must_change_password: Boolean(record.must_change_password),
      ...company,
    };

    // ── 2. Signal collection (Stage 1) ─────────────────────────────────────
    const reqIp =
      (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '192.168.1.105';
    const userAgent = req.headers.get('user-agent') || 'Chrome on Windows';

    const trustedFingerprints = (record.trusted_fingerprints as string[] | undefined) || [];
    const createdDaysAgo = record.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const lastLoginAt = (record.last_login_at as string | undefined) || null;
    const daysSinceLastLogin = lastLoginAt
      ? Math.max(0, Math.floor((Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)))
      : createdDaysAgo;

    // ── STRICT SECURITY: Call Python AI Risk Service ────────────────
    const mockMode = isMockMode();
    let blocked = false;
    
    const deviceId = fingerprint?.hash
      ? `dev-${fingerprint.hash.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`
      : `dev-${crypto.randomBytes(4).toString('hex')}`;
      
    // Prepare telemetry payload based on the Pydantic schemas
    const riskPayload = {
      user_id: userData.id,
      timestamp: new Date().toISOString(),
      ip_address: reqIp,
      location: {
        latitude: location?.latitude || 37.7749,
        longitude: location?.longitude || -122.4194
      },
      device_id: deviceId,
      device_is_corporate: true, // Mocked as true for this demo
      device_is_compliant: !blocked,
      network_type: network?.type === 'vpn' ? 'VPN' : (network?.type === 'tor' ? 'TOR' : 'ISP'),
      typing_anomaly_score: typingMetrics?.rhythm_variance || 5.0
    };

    let requiresMfa = true;
    let riskScore = 60;
    let riskLevel = 'medium';
    let reasons: string[] = ['Simulated Risk Policy Enforced'];

    // Bypass Python AI Risk Service to guarantee MFA for testing
    /*
    try {
      const riskResponse = await fetch('http://127.0.0.1:8000/api/v1/risk-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-risk-key-2026'
        },
        body: JSON.stringify(riskPayload),
      });

      if (riskResponse.ok) {
        const riskData = await riskResponse.json();
        riskScore = riskData.final_score;
        
        if (riskData.llm_explanation) {
            reasons = [riskData.llm_explanation];
        } else {
            reasons = riskData.triggered_overrides.length > 0 ? riskData.triggered_overrides : Object.keys(riskData.factors).map(k => `${k}: ${riskData.factors[k]}`);
        }
        
        if (riskData.action === 'ALLOW') {
          requiresMfa = false;
          riskLevel = 'low';
        } else if (riskData.action === 'CHALLENGE') {
          requiresMfa = true;
          riskLevel = 'medium';
        } else if (riskData.action === 'BLOCK') {
          blocked = true;
          requiresMfa = true; // Ensure they can't bypass
          riskLevel = 'high';
        }
      } else {
        console.error('Risk service returned non-200 status:', riskResponse.status);
      }
    } catch (err) {
      console.error('Failed to reach Python AI Risk Service, falling back to strict MFA:', err);
    }
    */

    // ── 3. Telemetry + trust persistence ────────────────────────────────────


    MockDB.devices.unshift({
      id: deviceId,
      device_name: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Endpoint',
      device_type: userAgent.includes('Mobile') ? 'mobile' : 'laptop',
      os: fingerprint?.os || (userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : 'Linux'),
      browser: userAgent.includes('Chrome') ? 'Chrome' : 'Safari',
      is_trusted: !blocked,
      last_used: new Date().toISOString(),
      last_active: new Date().toISOString(),
      user_id: userData.id,
    });

    const locations = ['San Jose, CA HQ', 'New York Branch', 'Remote (IP)'];
    MockDB.office_access_logs.unshift({
      id: `oal-${crypto.randomBytes(4).toString('hex')}`,
      user_id: userData.id,
      access_type: blocked ? 'DENIED' : 'ENTRY',
      location: location?.city || locations[Math.floor(Math.random() * locations.length)],
      timestamp: new Date().toISOString(),
    });

    MockDB.risk_scores.unshift({
      id: `rs-${crypto.randomBytes(4).toString('hex')}`,
      user_id: userData.id,
      score: riskScore,
      level: riskLevel,
      evaluated_at: new Date().toISOString(),
    });

    if (riskScore >= 61) {
      MockDB.alerts.unshift({
        id: `alert-${crypto.randomBytes(4).toString('hex')}`,
        type: 'HIGH_RISK_LOGIN',
        severity: 'warning',
        user_id: userData.id,
        details: `${riskScore}/100 — ${reasons.join(', ')}`,
        created_at: new Date().toISOString(),
      });
    } else if (Math.random() > 0.9) {
      MockDB.alerts.unshift({
        id: `alert-${crypto.randomBytes(4).toString('hex')}`,
        type: 'NEW_DEVICE_REGISTERED',
        severity: 'info',
        user_id: userData.id,
        created_at: new Date().toISOString(),
      });
    }

    // Remember the device/location only when the attempt is not blocked, so a
    // repeat login from the same context scores lower (smart friction).
    if (!blocked) {
      const trusted = new Set<string>(trustedFingerprints);
      if (fingerprint?.hash) trusted.add(fingerprint.hash);
      MockEmployees.update(record.id, {
        last_login_at: new Date().toISOString(),
        last_ip: reqIp,
        last_city: location?.city || record.last_city || null,
        last_country: location?.country || record.last_country || null,
        trusted_fingerprints: [...trusted].slice(-10),
      });
    }

    saveMockDB();

    // Establish the session for protected routes (middleware + AuthGuard check
    // for this cookie / the persisted auth store).
    // ── 4. Response: the ceremony the policy demands ───────────────────────
    const response = NextResponse.json({
      user: userData,
      tempToken: requiresMfa ? `pending_${crypto.randomUUID()}` : undefined,
      requiresMfa,
      blocked,
      // Backward-compatible flag: an extra step is required before session.
      requiresBiometric: requiresMfa,
      risk: {
        score: riskScore,
        level: riskLevel,
        reasons,
        mfaRequirement: requiresMfa ? 'totp' : 'none',
      },
    });

    if (mockMode) {
      response.cookies.set('mock_session', JSON.stringify(userData), { httpOnly: true, path: '/' });
    }

    return response;

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
