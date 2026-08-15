import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, findEmployee, HttpError } from '@/lib/face/auth';
import { reportError } from '@/lib/face/monitoring';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface EnrollBody {
  employeeId?: string;
  email?: string;
  photos?: string[];
  embeddings?: number[][];
  consentGiven?: boolean;
}

/**
 * POST /api/admin/enroll-face
 *
 * Admin-only employee enrollment. Accepts up to 3 photos (front / left 15° /
 * right 15°) with client-computed FaceNet embeddings, averages them, encrypts
 * with AES-256, records consent, and stores ONLY the encrypted embedding.
 * Raw photos get a 24-hour cleanup TTL (see /api/cron/cleanup-face-photos).
 */
export async function POST(req: NextRequest) {
  let body: EnrollBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { employeeId, email, photos, embeddings, consentGiven } = body;

  try {
    await requireAdmin();

    const identifier = employeeId || email;
    if (!identifier) {
      return NextResponse.json({ error: 'Missing employee identifier' }, { status: 400 });
    }
    const employee = await findEmployee(identifier);

    // Forward to Python Face Auth Service
    const response = await fetch('http://127.0.0.1:8001/api/v1/face/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer face-api-key-2026'
      },
      body: JSON.stringify({
        employeeId: employee.id,
        photos: photos ?? [],
        embeddings: embeddings ?? [],
        consentGiven: consentGiven === true
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ error: errorData.detail || 'Enrollment failed in Face API' }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: result.message || 'Face enrollment completed. Embedding encrypted and stored.',
      embedding_id: result.embedding_id
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    reportError('enroll-face', err, { employeeId: employeeId || email });
    return NextResponse.json({ error: 'Enrollment failed. Please try again.' }, { status: 500 });
  }
}
