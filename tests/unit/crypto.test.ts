import { describe, expect, it, beforeEach } from 'vitest';
import { encryptEmbedding, decryptEmbedding, FaceCryptoError } from '@/lib/face/crypto';

const TEST_KEY = Buffer.from('a'.repeat(32)).toString('base64');

beforeEach(() => {
  process.env.FACE_EMBEDDING_ENCRYPTION_KEY = TEST_KEY;
});

describe('AES-256-GCM embedding encryption', () => {
  it('round-trips a 128-dim embedding exactly', () => {
    const embedding = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.7);
    const encrypted = encryptEmbedding(embedding);
    expect(encrypted).not.toContain('0.7024'); // no plaintext leakage
    const decrypted = decryptEmbedding(encrypted);
    expect(decrypted.length).toBe(128);
    decrypted.forEach((n, i) => expect(n).toBeCloseTo(embedding[i], 10));
  });

  it('produces a unique ciphertext per call (randomized IV)', () => {
    const embedding = Array.from({ length: 128 }, () => 0.5);
    expect(encryptEmbedding(embedding)).not.toBe(encryptEmbedding(embedding));
  });

  it('rejects tampered ciphertext via GCM auth tag', () => {
    const encrypted = encryptEmbedding(Array.from({ length: 128 }, () => 0.1));
    const [iv, data, tag] = encrypted.split('.');
    // Flip a bit in the ciphertext.
    const bytes = Buffer.from(data, 'base64');
    bytes[0] ^= 0x01;
    const tampered = [iv, bytes.toString('base64'), tag].join('.');
    expect(() => decryptEmbedding(tampered)).toThrow(FaceCryptoError);
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptEmbedding('not-a-valid-payload')).toThrow(FaceCryptoError);
    expect(() => decryptEmbedding('')).toThrow(FaceCryptoError);
  });

  it('cannot be decrypted with a different key', () => {
    const encrypted = encryptEmbedding(Array.from({ length: 128 }, () => 0.2));
    process.env.FACE_EMBEDDING_ENCRYPTION_KEY = Buffer.from('b'.repeat(32)).toString('base64');
    expect(() => decryptEmbedding(encrypted)).toThrow(FaceCryptoError);
  });

  it('refuses to encrypt an empty embedding', () => {
    expect(() => encryptEmbedding([])).toThrow(FaceCryptoError);
  });
});
