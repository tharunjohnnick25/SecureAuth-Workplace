import { isValidEmbedding, averageEmbeddings, EMBEDDING_DIMENSIONS } from './embedding';
import { encryptEmbedding } from './crypto';
import { saveEnrollmentPhotos, looksLikeJpegOrPng } from './photo-storage';
import { FACE_ERROR_MESSAGES } from './errors';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { createAdminClient } from '@/lib/supabase/server';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
export const REQUIRED_SAMPLES = 3;

export interface EnrollEmployeeOptions {
  employeeId: string;
  photos: string[];
  embeddings?: number[][];
  consentGiven: boolean;
}

export interface EnrollResult {
  samples: number;
  consentTimestamp: string;
}

export class EnrollError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EnrollError';
    this.status = status;
  }
}

/**
 * Core enrollment pipeline shared by admin enrollment and employee re-enroll:
 * validate photos, (optionally) re-extract embeddings server-side via the CV
 * microservice, average the samples, encrypt with AES-256-GCM, record consent,
 * and persist ONLY the encrypted embedding. Photos get a 24h cleanup TTL.
 */
export async function enrollEmployee(opts: EnrollEmployeeOptions): Promise<EnrollResult> {
  const { employeeId, photos, embeddings, consentGiven } = opts;

  if (consentGiven !== true) {
    throw new EnrollError(400, FACE_ERROR_MESSAGES.CONSENT_REQUIRED);
  }
  if (!photos || photos.length === 0 || photos.length > REQUIRED_SAMPLES) {
    throw new EnrollError(400, `Exactly ${REQUIRED_SAMPLES} photos (front, left, right) are required`);
  }

  for (const b64 of photos) {
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(Buffer.from(b64, 'base64'));
    } catch {
      throw new EnrollError(400, FACE_ERROR_MESSAGES.INVALID_IMAGE);
    }
    if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
      throw new EnrollError(400, FACE_ERROR_MESSAGES.INVALID_IMAGE);
    }
    if (!looksLikeJpegOrPng(bytes)) {
      throw new EnrollError(400, FACE_ERROR_MESSAGES.INVALID_IMAGE);
    }
  }

  // ── Embedding extraction ─────────────────────────────────────────────────
  let finalEmbeddings: number[][] | null = null;
  const pythonUrl = process.env.PYTHON_FACE_SERVICE_URL || 'http://127.0.0.1:8001';

  if (pythonUrl) {
    finalEmbeddings = [];
    for (const b64 of photos) {
      const res = await fetch(`${pythonUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 }),
      });
      if (!res.ok) {
        throw new EnrollError(502, 'Face service rejected an enrollment photo');
      }
      const data = await res.json();
      if (!isValidEmbedding(data?.embedding)) {
        throw new EnrollError(502, 'Failed to extract face embedding');
      }
      finalEmbeddings.push(data.embedding as number[]);
    }
  } else if (embeddings && embeddings.length >= 2) {
    finalEmbeddings = embeddings.map((e) => Array.from(e));
  }

  if (!finalEmbeddings || finalEmbeddings.length === 0) {
    throw new EnrollError(400, 'No embeddings received. Re-run detection and retry.');
  }
  if (finalEmbeddings.some((e) => e.length !== EMBEDDING_DIMENSIONS)) {
    throw new EnrollError(400, `FaceNet embeddings must be ${EMBEDDING_DIMENSIONS}-dimensional`);
  }

  const averaged = averageEmbeddings(finalEmbeddings);
  const encrypted = encryptEmbedding(averaged);
  const consentTimestamp = new Date().toISOString();

  if (isMockMode()) {
    MockEmployees.update(employeeId, {
      face_enrolled: true,
      face_embedding_encrypted: encrypted,
      face_embedding_version: 'facenet-128',
      face_consent_given: true,
      face_consent_timestamp: consentTimestamp,
      face_enrolled_at: consentTimestamp,
      face_delete_requested_at: null,
    });
  } else {
    const admin = await createAdminClient();
    const { error } = await admin
      .from('users')
      .update({
        face_enrolled: true,
        face_embedding_encrypted: encrypted,
        face_embedding_version: 'facenet-128',
        face_consent_given: true,
        face_consent_timestamp: consentTimestamp,
        face_enrolled_at: consentTimestamp,
        face_delete_requested_at: null,
      })
      .eq('id', employeeId);
    if (error) throw error;
  }

  saveEnrollmentPhotos(
    employeeId,
    photos.map((base64, index) => ({ index, base64 })),
  );

  return { samples: finalEmbeddings.length, consentTimestamp };
}
