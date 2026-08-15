/**
 * FaceNet embedding math: normalization, cosine similarity, and averaging.
 * FaceNet (face-api.js) produces 128-dimensional embeddings; cosine similarity
 * in the range [-1, 1] with a threshold of 0.6 grants access.
 */

export const EMBEDDING_DIMENSIONS = 128;
export const MATCH_THRESHOLD = 0.6;

export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/** Validates the shape and finiteness of an embedding array. */
export function isValidEmbedding(embedding: unknown): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.length > 0 &&
    embedding.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/** L2-normalizes a vector in place of the returned copy. */
export function normalizeEmbedding(embedding: number[]): number[] {
  if (!isValidEmbedding(embedding)) {
    throw new EmbeddingError('Cannot normalize an invalid embedding');
  }
  const norm = Math.sqrt(embedding.reduce((sum, n) => sum + n * n, 0));
  if (norm === 0) {
    throw new EmbeddingError('Cannot normalize a zero vector');
  }
  return embedding.map((n) => n / norm);
}

/**
 * Cosine similarity between two embeddings. Inputs do not need to be
 * pre-normalized; the computation normalizes internally.
 * Returns a value in [-1, 1] (identical vectors → 1).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!isValidEmbedding(a) || !isValidEmbedding(b)) {
    throw new EmbeddingError('Cosine similarity requires two non-empty numeric arrays');
  }
  if (a.length !== b.length) {
    throw new EmbeddingError(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Averages multiple same-dimension embeddings (e.g. front / left / right
 * samples) into a single enrollment embedding for higher accuracy.
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new EmbeddingError('Cannot average an empty embedding list');
  }
  const dim = embeddings[0].length;
  if (embeddings.some((e) => !isValidEmbedding(e) || e.length !== dim)) {
    throw new EmbeddingError('All embeddings must be valid and share the same dimension');
  }

  const mean: number[] = new Array(dim).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < dim; i++) {
      mean[i] += embedding[i] / embeddings.length;
    }
  }
  return normalizeEmbedding(mean);
}
