import { createAdminClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-mode';
import { cleanupExpiredPhotos } from './photo-storage';

/**
 * Scheduled data-lifecycle jobs:
 *  - purge enrollment photos older than 24h,
 *  - hard-delete biometric data for soft-deletion requests past 30 days.
 */

export interface PurgeResult {
  photosPurged: number;
  employeesPurged: number;
}

/** Runs both lifecycle jobs. Safe to invoke from a cron / cloud function. */
export async function runBiometricLifecycleJobs(): Promise<PurgeResult> {
  const photosPurged = cleanupExpiredPhotos();

  if (isMockMode()) {
    return { photosPurged, employeesPurged: 0 };
  }

  let employeesPurged = 0;
  try {
    const admin = await createAdminClient();

    const { data: pending, error } = await admin.rpc('pending_biometric_purges');
    if (error) throw error;

    const rows = (pending ?? []) as Array<{ employee_id: string }>;
    for (const row of rows) {
      await admin.rpc('purge_biometric_data', { p_employee_id: row.employee_id });
      await admin
        .from('biometric_deletion_requests')
        .update({ status: 'COMPLETED', hard_deleted_at: new Date().toISOString() })
        .eq('employee_id', row.employee_id)
        .eq('status', 'PENDING');
      employeesPurged++;
    }
  } catch (err) {
    console.error('[biometric-lifecycle] purge failed:', err);
  }

  return { photosPurged, employeesPurged };
}
