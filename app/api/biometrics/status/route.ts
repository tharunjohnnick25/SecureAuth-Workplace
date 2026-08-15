import { NextResponse } from 'next/server';
import { requireEmployee, HttpError } from '@/lib/face/auth';
import { getFaceLoginAttempts } from '@/lib/face/audit';
import { reportError } from '@/lib/face/monitoring';
import { isMockMode } from '@/lib/mock-employees';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/biometrics/status
 *
 * Returns the signed-in employee's biometric enrollment status (metadata only —
 * never the embedding itself) plus recent face login attempts for transparency.
 */
export async function GET() {
  try {
    const profile = await requireEmployee();

    let status: {
      faceEnrolled: boolean;
      consentGiven: boolean;
      consentTimestamp: string | null;
      enrolledAt: string | null;
      lastFaceLoginAt: string | null;
      deleteRequestedAt: string | null;
      deletionScheduledFor: string | null;
    };

    if (isMockMode()) {
      const { MockEmployees } = await import('@/lib/mock-employees');
      const record = MockEmployees.getById(profile.id);
      status = {
        faceEnrolled: record?.face_enrolled === true,
        consentGiven: record?.face_consent_given === true,
        consentTimestamp: (record?.face_consent_timestamp as string) ?? null,
        enrolledAt: (record?.face_enrolled_at as string) ?? null,
        lastFaceLoginAt: (record?.last_face_login_at as string) ?? null,
        deleteRequestedAt: (record?.face_delete_requested_at as string) ?? null,
        deletionScheduledFor: record?.face_delete_requested_at
          ? new Date(new Date(record.face_delete_requested_at as string).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      };
    } else {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from('users')
        .select(
          'face_enrolled, face_consent_given, face_consent_timestamp, face_enrolled_at, last_face_login_at, face_delete_requested_at',
        )
        .eq('id', profile.id)
        .maybeSingle();

      const deletionScheduledFor = data?.face_delete_requested_at
        ? await getDeletionDeadline(data.face_delete_requested_at)
        : null;

      status = {
        faceEnrolled: data?.face_enrolled === true,
        consentGiven: data?.face_consent_given === true,
        consentTimestamp: data?.face_consent_timestamp ?? null,
        enrolledAt: data?.face_enrolled_at ?? null,
        lastFaceLoginAt: data?.last_face_login_at ?? null,
        deleteRequestedAt: data?.face_delete_requested_at ?? null,
        deletionScheduledFor,
      };
    }

    const attempts = await getFaceLoginAttempts(profile.id, 10);

    return NextResponse.json({ success: true, status, attempts });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    reportError('biometrics-status', err);
    return NextResponse.json({ error: 'Failed to load biometric status' }, { status: 500 });
  }
}

async function getDeletionDeadline(requestedAt: string): Promise<string | null> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = await createAdminClient();
    const { data } = await admin
      .from('biometric_deletion_requests')
      .select('scheduled_hard_delete_at')
      .eq('requested_at', requestedAt)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.scheduled_hard_delete_at ?? null;
  } catch {
    return null;
  }
}
