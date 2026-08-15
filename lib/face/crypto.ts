import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_ENV = 'FACE_EMBEDDING_ENCRYPTION_KEY';

export class FaceCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaceCryptoError';
  }
}

/**
 * Returns the 32-byte AES-256 key. In production the key MUST come from
 * `FACE_EMBEDDING_ENCRYPTION_KEY` (base64 of 32 bytes). A derived dev-only key
 * is used as a last resort so the app can run locally.
 */
function getKey(): Buffer {
  const encoded = process.env[KEY_ENV];
  if (encoded) {
    let key: Buffer;
    try {
      key = Buffer.from(encoded, 'base64');
    } catch {
      throw new FaceCryptoError(`Invalid ${KEY_ENV}: must be base64-encoded 32 bytes`);
    }
    if (key.length !== 32) {
      throw new FaceCryptoError(`Invalid ${KEY_ENV}: expected 32 bytes, got ${key.length}`);
    }
    return key;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new FaceCryptoError(`${KEY_ENV} is required in production`);
  }

  // Dev-only deterministic key derived from a fixed secret so existing
  // enrollments survive restarts. Never use this outside local development.
  const fallback = Buffer.from(
    'dev-face-embedding-key-do-not-use-in-prod-0123456789abcdef',
  );
  return fallback.subarray(0, 32);
}

/** Generates a new base64 32-byte AES-256 key for .env configuration. */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Encrypts a numeric embedding into `iv.ciphertext.authTag` (base64).
 * This is what gets stored in `users.face_embedding_encrypted`.
 */
export function encryptEmbedding(embedding: number[]): string {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new FaceCryptoError('Cannot encrypt an empty embedding');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const json = JSON.stringify(embedding);
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const parts = [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')];
  return parts.join('.');
}

/**
 * Decrypts a `iv.ciphertext.authTag` payload back into the numeric embedding.
 * Throws FaceCryptoError on tampering, wrong key, or malformed payload.
 */
export function decryptEmbedding(payload: string): number[] {
  if (!payload || typeof payload !== 'string') {
    throw new FaceCryptoError('Empty encrypted embedding payload');
  }
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new FaceCryptoError('Malformed encrypted embedding payload');
  }
  const [ivB64, dataB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(dataB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new FaceCryptoError('Invalid IV or auth tag length');
  }

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  let plaintext: string;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new FaceCryptoError('Embedding decryption failed (tampered or wrong key)');
  }

  const parsed = JSON.parse(plaintext);
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((n) => typeof n !== 'number')) {
    throw new FaceCryptoError('Decrypted embedding is not a numeric array');
  }
  return parsed as number[];
}
