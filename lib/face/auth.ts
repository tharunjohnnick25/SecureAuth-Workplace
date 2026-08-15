import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';

const ADMIN_ROLE_VALUES = new Set(['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin', 'ORGANIZATION_ADMIN']);

export interface AuthedProfile {
  id: string;
  email: string;
  role: string;
}

/**
 * Verifies the caller is signed in and is an admin. Throws with a
 * { status, message } shape for route handlers to map to responses.
 */
export async function requireAdmin(): Promise<AuthedProfile> {
  if (isMockMode()) {
    // Mock mode: treat the caller as an admin so the flows are testable.
    return { id: 'mock-admin', email: 'admin@test', role: 'ADMIN' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(profile?.role ?? '').toUpperCase();
  if (!ADMIN_ROLE_VALUES.has(role)) {
    throw new HttpError(403, 'Forbidden: admin role required');
  }

  return { id: profile.id, email: profile.email, role };
}

/**
 * Verifies the caller is signed in (any role). Used for self-service
 * biometrics pages (status / re-enroll / delete).
 */
export async function requireEmployee(): Promise<AuthedProfile> {
  if (isMockMode()) {
    return { id: 'mock-employee', email: 'sarah.c@enterprise.com', role: 'EMPLOYEE' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: profile?.id ?? user.id,
    email: profile?.email ?? user.email ?? '',
    role: String(profile?.role ?? 'EMPLOYEE'),
  };
}

/** Resolves an employee (real DB or mock store) by email or id. */
export async function findEmployee(identifier: string) {
  if (isMockMode()) {
    const record = MockEmployees.findForLogin(identifier.includes('@') ? identifier : undefined, identifier);
    if (!record) throw new HttpError(404, 'Employee not found');
    return {
      id: record.id,
      email: record.email,
      fullName: record.full_name,
      role: record.role,
      faceEnrolled: record.face_enrolled === true,
      faceEmbeddingEncrypted: record.face_embedding_encrypted as string | null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const key = identifier.includes('@') ? 'email' : 'id';
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, face_enrolled, face_embedding_encrypted, face_consent_given, face_consent_timestamp, face_delete_requested_at')
    .eq(key, identifier)
    .maybeSingle();

  if (error || !data) throw new HttpError(404, 'Employee not found');

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    faceEnrolled: data.face_enrolled === true,
    faceEmbeddingEncrypted: data.face_embedding_encrypted,
    consentGiven: data.face_consent_given === true,
    consentTimestamp: data.face_consent_timestamp,
    deleteRequestedAt: data.face_delete_requested_at,
  };
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
