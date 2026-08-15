import { NextRequest, NextResponse } from 'next/server';
import { requireEmployee, HttpError } from '@/lib/face/auth';
import { reportError } from '@/lib/face/monitoring';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const HARD_DELETE_AFTER_DAYS = 30;

/**
 * POST /api/biometrics/delete
 *
 * Employee self-service biometric data deletion. Soft-deletes immediately
 * (revokes consent, clears the encrypted embedding) and schedules the hard
 * delete for 30 days later, per GDPR right-to-erasure and DPDP requirements.
 */
export async function POST(_req: NextRequest) {
  try {
    const profile = await requireEmployee();

    if (isMockMode()) {
      MockEmployees.update(profile.id, {
        face_enrolled: false,
        face_embedding_encrypted: null,
        face_embedding_version: null,
        face_consent_given: false,
        face_consent_timestamp: null,
        face_delete_requested_at: new Date().toISOString(),
      });
      const scheduled = new Date(Date.now() + HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
      return NextResponse.json({
        success: true,
        message: 'Biometric data deletion scheduled. Hard delete will complete in 30 days.',
        scheduledHardDeleteAt: scheduled,
      });
    }

    const admin = await createAdminClient();

    // 1. Soft delete: clear live biometrics + revoke consent.
    const { error: updateError } = await admin
      .from('users')
      .update({
        face_enrolled: false,
        face_embedding_encrypted: null,
        face_embedding_version: null,
        face_consent_given: false,
        face_consent_timestamp: null,
        face_delete_requested_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    if (updateError) throw updateError;

    // 2. Deactivate any face_embeddings rows.
    await admin.from('face_embeddings').update({ is_active: false }).eq('user_id', profile.id);

    // 3. Schedule the hard delete.
    const scheduled = new Date(Date.now() + HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('biometric_deletion_requests').insert({
      employee_id: profile.id,
      requested_by: profile.id,
      scheduled_hard_delete_at: scheduled,
      status: 'PENDING',
    });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: 'Biometric data deletion scheduled. Hard delete will complete in 30 days.',
      scheduledHardDeleteAt: scheduled,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    reportError('biometrics-delete', err);
    return NextResponse.json({ error: 'Failed to schedule deletion. Please try again.' }, { status: 500 });
  }
}
