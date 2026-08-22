import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface FingerprintInput {
  hash?: string;
  canvas_hash?: string;
  webgl_hash?: string;
  hardware_concurrency?: number;
  device_memory?: number;
}

export interface TypingMetricsInput {
  rhythm_variance?: number;
  flight_time_avg?: number;
  dwell_time_avg?: number;
  error_rate?: number;
  profile_confidence_score?: number;
}

export interface RiskFactors {
  [key: string]: unknown;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuidOrNull = (value: string | null): string | null => (value && UUID_RE.test(value) ? value : null);

export async function recordDeviceFingerprint(
  admin: SupabaseClient,
  userId: string,
  fingerprint?: FingerprintInput
): Promise<void> {
  if (!fingerprint?.hash) return;
  try {
    await admin.from('device_fingerprint').upsert(
      {
        id: randomUUID(),
        user_id: userId,
        device_id: null,
        fingerprint_hash: fingerprint.hash,
        canvas_hash: fingerprint.canvas_hash || null,
        webgl_hash: fingerprint.webgl_hash || null,
        hardware_concurrency: fingerprint.hardware_concurrency ?? null,
        device_memory: fingerprint.device_memory ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'fingerprint_hash' }
    );
  } catch (err) {
    console.error('[Device Fingerprint Log Error]', err);
  }
}

export async function recordTypingBehavior(
  admin: SupabaseClient,
  userId: string,
  metrics?: TypingMetricsInput
): Promise<void> {
  if (!metrics) return;
  try {
    const confidence = metrics.profile_confidence_score ?? clamp(100 - (metrics.rhythm_variance || 0) * 10, 0, 100);
    await admin.from('typing_behavior').insert({
      id: randomUUID(),
      user_id: userId,
      flight_time_avg: metrics.flight_time_avg ?? null,
      dwell_time_avg: metrics.dwell_time_avg ?? null,
      error_rate: metrics.error_rate ?? null,
      profile_confidence_score: confidence,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Typing Behavior Log Error]', err);
  }
}

export async function upsertBehavioralProfile(
  admin: SupabaseClient,
  userId: string,
  trustScore: number,
  factors: RiskFactors = {}
): Promise<void> {
  try {
    const { data: existing } = await admin
      .from('behavioral_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await admin.from('behavioral_profiles').update({
        trust_score: trustScore,
        typing_baseline: { rhythm_variance: factors.typing_anomaly_score ?? null },
        login_patterns: factors,
        last_updated: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await admin.from('behavioral_profiles').insert({
        id: randomUUID(),
        user_id: userId,
        trust_score: trustScore,
        typing_baseline: { rhythm_variance: factors.typing_anomaly_score ?? null },
        mouse_baseline: {},
        login_patterns: factors,
        last_updated: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Behavioral Profile Error]', err);
  }
}

export async function upsertBehavioralBaseline(
  admin: SupabaseClient,
  userId: string,
  metrics?: TypingMetricsInput
): Promise<void> {
  try {
    const baseline: Record<string, unknown> = {
      user_id: userId,
      avg_wpm: metrics?.flight_time_avg ?? null,
      wpm_variance: metrics?.dwell_time_avg ?? null,
      last_updated_at: new Date().toISOString(),
    };
    const { data: existing } = await admin
      .from('behavioral_baselines')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await admin.from('behavioral_baselines').update(baseline).eq('user_id', userId);
    } else {
      await admin.from('behavioral_baselines').insert({
        ...baseline,
        typical_ips: [],
        trusted_devices: [],
        typical_login_hours: [],
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Behavioral Baseline Error]', err);
  }
}

export async function recordMlRiskLog(
  admin: SupabaseClient,
  userId: string,
  sessionId: string | null,
  riskScore: number,
  riskLevel: string,
  topFactors: RiskFactors = {},
  telemetryData: RiskFactors = {}
): Promise<void> {
  try {
    await admin.from('ml_risk_logs').insert({
      id: randomUUID(),
      user_id: userId,
      session_id: sessionId || null,
      risk_score: riskScore,
      risk_level: riskLevel,
      top_factors: topFactors,
      telemetry_data: telemetryData,
      evaluated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ML Risk Log Error]', err);
  }
}

export async function recordMlPrediction(
  admin: SupabaseClient,
  userId: string,
  modelName: string,
  inputs: RiskFactors = {},
  outputs: RiskFactors = {}
): Promise<void> {
  try {
    await admin.from('ml_predictions').insert({
      id: randomUUID(),
      user_id: userId,
      model_name: modelName,
      inputs,
      outputs,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ML Prediction Log Error]', err);
  }
}

export async function recordGeoLocation(
  admin: SupabaseClient,
  userId: string,
  sessionId: string | null,
  ipAddress: string | null,
  latitude?: number,
  longitude?: number,
  isSuspicious = false
): Promise<void> {
  try {
    await admin.from('geo_locations').insert({
      id: randomUUID(),
      user_id: userId,
      session_id: asUuidOrNull(sessionId),
      ip_address: ipAddress || null,
      city: null,
      country: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      is_suspicious: isSuspicious,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Geo Location Log Error]', err);
  }
}

export async function recordOauthAccount(
  admin: SupabaseClient,
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<void> {
  if (!provider || provider === 'email') return;
  try {
    await admin.from('oauth_accounts').upsert(
      {
        id: randomUUID(),
        user_id: userId,
        provider,
        provider_account_id: providerAccountId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'provider,provider_account_id' }
    );
  } catch (err) {
    console.error('[OAuth Account Log Error]', err);
  }
}

export async function ensureAdminRecord(
  admin: SupabaseClient,
  userId: string,
  email: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) return;
  try {
    await admin.from('admins').upsert(
      { id: userId, email },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.error('[Admin Record Error]', err);
  }
}

export async function recordOfficeAccess(
  admin: SupabaseClient,
  userId: string,
  accessType: string,
  location: string | null,
  deviceInfo: Record<string, unknown> | null,
  verified: boolean
): Promise<void> {
  try {
    await admin.from('office_access_logs').insert({
      id: randomUUID(),
      user_id: userId,
      access_type: accessType,
      location: location || null,
      device_info: deviceInfo,
      verified,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Office Access Log Error]', err);
  }
}

const PERMISSION_ACTIONS = [
  'view_dashboard',
  'view_attendance',
  'manage_attendance',
  'request_leave',
  'approve_leave',
  'manage_employees',
  'manage_tasks',
  'manage_security',
  'view_reports',
  'manage_roles',
] as const;

const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  super_admin: [...PERMISSION_ACTIONS],
  admin: [...PERMISSION_ACTIONS],
  manager: ['view_dashboard', 'view_attendance', 'request_leave', 'approve_leave', 'manage_tasks', 'view_reports'],
  hr_manager: ['view_dashboard', 'view_attendance', 'request_leave', 'approve_leave', 'manage_tasks', 'view_reports'],
  employee: ['view_dashboard', 'view_attendance', 'request_leave'],
};

export async function ensurePermissions(admin: SupabaseClient): Promise<void> {
  try {
    const { data: existing } = await admin
      .from('permissions')
      .select('id, action');

    const existingByAction = new Map((existing || []).map((p) => [p.action, p.id]));

    const toInsert = PERMISSION_ACTIONS.filter((action) => !existingByAction.has(action)).map((action) => ({
      id: randomUUID(),
      action,
      description: `Permission for ${action.replace(/_/g, ' ')}`,
    }));

    if (toInsert.length > 0) {
      const { data: inserted } = await admin.from('permissions').insert(toInsert).select('id, action');
      (inserted || []).forEach((p) => existingByAction.set(p.action, p.id));
    }

    const { data: roles } = await admin.from('roles').select('id, name');
    const links: { role_id: string; permission_id: string }[] = [];
    for (const role of roles || []) {
      const actions = ROLE_PERMISSION_MAP[String(role.name || '').toLowerCase().replace(/\s+/g, '_')];
      if (!actions) continue;
      for (const action of actions) {
        const permissionId = existingByAction.get(action);
        if (permissionId) {
          links.push({ role_id: role.id, permission_id: permissionId });
        }
      }
    }
    if (links.length > 0) {
      await admin.from('role_permissions').upsert(links, { onConflict: 'role_id,permission_id' });
    }
  } catch (err) {
    console.error('[Permissions Seed Error]', err);
  }
}

export async function ensureCompanyOrgBranch(
  admin: SupabaseClient,
  companyId: string | null
): Promise<void> {
  if (!companyId) return;
  try {
    const { data: company } = await admin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .maybeSingle();

    if (!company) return;
    const companyName = company.name;

    const { data: branch } = await admin
      .from('branches')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    if (!branch) {
      await admin.from('branches').insert({
        id: randomUUID(),
        company_id: companyId,
        name: 'Head Office',
        location: null,
      });
    }

    const { data: org } = await admin
      .from('organizations')
      .select('id')
      .eq('name', companyName)
      .limit(1)
      .maybeSingle();

    if (!org) {
      await admin.from('organizations').insert({
        id: randomUUID(),
        name: companyName,
        status: 'ACTIVE',
      });
    }
  } catch (err) {
    console.error('[Company Org Branch Error]', err);
  }
}
