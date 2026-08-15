/**
 * Canonical face-auth error messages shown to end users, plus a typed
 * FaceAuthError for API routes to raise consistently.
 */

export const FACE_ERROR_MESSAGES = {
  NO_FACE: 'No face detected. Please center your face and try again.',
  MULTIPLE_FACES: 'Multiple faces detected. Please ensure only one person is in the frame.',
  LOW_QUALITY: 'Camera quality too low. Please use a 720p or higher camera.',
  BAD_ANGLE: 'Please face the camera directly (angle must be under 45 degrees).',
  LOW_LIGHT: 'Lighting is too dim. Please enable screen flash or use IR assist.',
  LIVENESS_FAILED: 'Liveness check failed. Please ensure you’re not using a photo or video.',
  LIVENESS_TIMEOUT: 'Liveness check timed out. Please blink twice and turn your head as prompted.',
  NO_MATCH: 'Face does not match. Please try again or use passkey.',
  NOT_ENROLLED: 'No face enrolled for this account. Please contact your administrator.',
  CONSENT_REQUIRED: 'Biometric consent is required before enrolling a face.',
  INVALID_IMAGE: 'Invalid image. Please upload a valid JPG or PNG file (max 5MB).',
  RATE_LIMITED: 'Too many face login attempts. Please try again later or use a passkey.',
  ACCOUNT_LOCKED: 'Account temporarily locked after repeated failures. Please use a passkey or try again later.',
  UNVERIFIED_EMAIL: 'Invalid email address.',
} as const;

export type FaceErrorCode = keyof typeof FACE_ERROR_MESSAGES;

export class FaceAuthError extends Error {
  readonly code: FaceErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: FaceErrorCode, status = 400, details?: Record<string, unknown>) {
    super(FACE_ERROR_MESSAGES[code]);
    this.name = 'FaceAuthError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
