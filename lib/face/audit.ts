import { createAdminClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-mode';

export interface FaceLoginAttemptInput {
  employeeId?: string | null;
  attemptedEmail?: string | null;
  similarityScore?: number | null;
  livenessPass: boolean;
  livenessScore?: number | null;
  success: boolean;
  ipAddress?: string | null;
  deviceFingerprint?: string | null;
  failureReason?: string | null;
}

export interface FaceLoginAttempt {
  id: string;
  employeeId: string | null;
  attemptedEmail: string | null;
  timestamp: string;
  similarityScore: number | null;
  livenessPass: boolean;
  livenessScore: number | null;
  success: boolean;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  failureReason: string | null;
}

/** In-memory audit store used only in mock mode (NEXT_PUBLIC_MOCK_AUTH=true). */
const mockAttempts: FaceLoginAttempt[] = [];

/**
 * Persists a face login attempt for audit. In real deployments this writes to
 * `face_login_attempts` via the SECURITY DEFINER RPC (service role). In mock
 * mode it records to an in-memory store so the flows are testable offline.
 */
export async function recordFaceLoginAttempt(input: FaceLoginAttemptInput): Promise<string | null> {
  if (isMockMode()) {
    const attempt: FaceLoginAttempt = {
      id: crypto.randomUUID(),
      employeeId: input.employeeId ?? null,
      attemptedEmail: input.attemptedEmail ?? null,
      timestamp: new Date().toISOString(),
      similarityScore: input.similarityScore ?? null,
      livenessPass: input.livenessPass,
      livenessScore: input.livenessScore ?? null,
      success: input.success,
      ipAddress: input.ipAddress ?? null,
      deviceFingerprint: input.deviceFingerprint ?? null,
      failureReason: input.failureReason ?? null,
    };
    mockAttempts.push(attempt);
    return attempt.id;
  }

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.rpc('record_face_attempt', {
      p_employee_id: input.employeeId ?? null,
      p_attempted_email: input.attemptedEmail ?? null,
      p_similarity: input.similarityScore ?? null,
      p_liveness_pass: input.livenessPass,
      p_liveness_score: input.livenessScore ?? null,
      p_success: input.success,
      p_ip_address: input.ipAddress ?? null,
      p_device_fingerprint: input.deviceFingerprint ?? null,
      p_failure_reason: input.failureReason ?? null,
    });
    if (error) {
      console.error('[face-audit] record_face_attempt failed:', error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (err) {
    console.error('[face-audit] failed to record attempt:', err);
    return null;
  }
}

/** Returns recent attempts for audit/reporting. */
export async function getFaceLoginAttempts(employeeId: string, limit = 20): Promise<FaceLoginAttempt[]> {
  if (isMockMode()) {
    return mockAttempts
      .filter((a) => a.employeeId === employeeId)
      .slice(0, limit);
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('face_login_attempts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[face-audit] failed to read attempts:', error.message);
    return [];
  }
  return (data ?? []).map((row) => mapRow(row));
}

function mapRow(row: Record<string, unknown>): FaceLoginAttempt {
  return {
    id: String(row.id),
    employeeId: (row.employee_id as string) ?? null,
    attemptedEmail: (row.attempted_email as string) ?? null,
    timestamp: (row.timestamp as string) ?? new Date().toISOString(),
    similarityScore: row.similarity_score != null ? Number(row.similarity_score) : null,
    livenessPass: Boolean(row.liveness_pass),
    livenessScore: row.liveness_score != null ? Number(row.liveness_score) : null,
    success: Boolean(row.success),
    ipAddress: (row.ip_address as string) ?? null,
    deviceFingerprint: (row.device_fingerprint as string) ?? null,
    failureReason: (row.failure_reason as string) ?? null,
  };
}

/** Clears the in-memory audit store (used by tests). */
export function __resetMockAttempts() {
  mockAttempts.length = 0;
}
