/**
 * embeddings.ts — Vector Embedding Generation
 *
 * Uses Gemini's text-embedding model.
 * Falls back to a deterministic mock embedding for dev/testing.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 3072;

/**
 * Generate a text embedding using Gemini embedding API.
 * Falls back to mock embedding if API key not set.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    console.warn('[embeddings] GEMINI_API_KEY not set — using mock embedding');
    return mockEmbedding(text);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: 768,  
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini embedding error: ${err}`);
    }

    const data = await response.json();
    return data.embedding.values as number[];
  } catch (error) {
    console.error('[embeddings] Error generating embedding:', error);
    return mockEmbedding(text);
  }
}

/**
 * Cosine similarity between two vectors.
 * Returns value in [-1, 1]. Higher = more similar.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector dimension mismatch');

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Deterministic mock embedding based on text hash.
 * Ensures consistent dimension for testing without API.
 */
function mockEmbedding(text: string): number[] {
  const seed = hashString(text);
  const rng = seededRandom(seed);
  const raw = Array.from({ length: EMBEDDING_DIMENSIONS }, () => rng() * 2 - 1);

  // Normalize to unit vector
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0));
  return raw.map(v => v / norm);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}