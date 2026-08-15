import { NextRequest, NextResponse } from 'next/server';
import { runBiometricLifecycleJobs } from '@/lib/face/purge';
import { reportError } from '@/lib/face/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/cleanup-face-photos
 *
 * Invoked by a scheduler (Vercel Cron / cloud function / systemd timer):
 *  1. Deletes enrollment photos older than 24 hours.
 *  2. Hard-deletes biometric data whose 30-day window has elapsed.
 *
 * Guarded by CRON_SECRET (sent as `Authorization: Bearer <secret>` or
 * `?secret=...`). Always returns 200 so schedulers don't retry on policy.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('secret');

  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await runBiometricLifecycleJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    reportError('cron-cleanup', err);
    return NextResponse.json({ success: false, error: 'Lifecycle job failed' });
  }
}
