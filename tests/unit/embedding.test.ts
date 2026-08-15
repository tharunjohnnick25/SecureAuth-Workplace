import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  normalizeEmbedding,
  averageEmbeddings,
  isValidEmbedding,
  EMBEDDING_DIMENSIONS,
  EmbeddingError,
} from '@/lib/face/embedding';

describe('embedding utilities (FaceNet 128-dim)', () => {
  it('computes cosine similarity of identical vectors as 1', () => {
    const a = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => Math.sin(i + 1));
    const b = [...a];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('computes cosine similarity of orthogonal vectors as ~0', () => {
    const a = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 0 ? 1 : 0));
    const b = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 1 ? 1 : 0));
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns negative similarity for opposite vectors', () => {
    const a = Array.from({ length: 128 }, (_, i) => i + 1);
    const b = a.map((n) => -n);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('is scale-invariant (normalized inputs give same result)', () => {
    const a = Array.from({ length: 128 }, (_, i) => (i + 1) / 10);
    const b = a.map((n) => n + 0.1);
    const scaled = a.map((n) => n * 5);
    const s1 = cosineSimilarity(a, b);
    const s2 = cosineSimilarity(scaled, b);
    expect(s2).toBeCloseTo(s1, 5);
  });

  it('rejects dimension mismatches', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow(EmbeddingError);
  });

  it('normalizes vectors to unit length', () => {
    const v = normalizeEmbedding([3, 4]);
    expect(Math.sqrt(v[0] ** 2 + v[1] ** 2)).toBeCloseTo(1, 5);
  });

  it('rejects non-finite or empty vectors', () => {
    expect(isValidEmbedding([])).toBe(false);
    expect(isValidEmbedding([1, NaN])).toBe(false);
    expect(() => normalizeEmbedding([0, 0])).toThrow(EmbeddingError);
  });

  it('averages multiple samples and returns a unit vector', () => {
    const a = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1));
    const b = Array.from({ length: 128 }, (_, i) => Math.cos(i + 1));
    const avg = averageEmbeddings([a, b]);
    expect(avg.length).toBe(EMBEDDING_DIMENSIONS);
    const norm = Math.sqrt(avg.reduce((s, n) => s + n * n, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('matches above the 0.6 grant threshold for a similar pair', () => {
    const base = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1));
    const noisy = base.map((n) => n + (Math.random() - 0.5) * 0.05);
    expect(cosineSimilarity(base, noisy)).toBeGreaterThan(0.6);
  });
});
