import { NextRequest, NextResponse } from 'next/server';
import { requireEmployee, HttpError } from '@/lib/face/auth';
import { enrollEmployee, EnrollError } from '@/lib/face/enroll';
import { reportError } from '@/lib/face/monitoring';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/biometrics/re-enroll
 *
 * Employee self-service re-enrollment (used from /settings/biometrics).
 * Same pipeline as admin enrollment but scoped to the signed-in employee.
 */
export async function POST(req: NextRequest) {
  let body: { photos?: string[]; embeddings?: number[][]; consentGiven?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const profile = await requireEmployee();
    const result = await enrollEmployee({
      employeeId: profile.id,
      photos: body.photos ?? [],
      embeddings: body.embeddings,
      consentGiven: body.consentGiven === true,
    });

    return NextResponse.json({
      success: true,
      message: 'Face re-enrolled successfully. Embedding encrypted and stored; photos will be deleted in 24 hours.',
      consentTimestamp: result.consentTimestamp,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof EnrollError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    reportError('biometrics-reenroll', err);
    return NextResponse.json({ error: 'Re-enrollment failed. Please try again.' }, { status: 500 });
  }
}
