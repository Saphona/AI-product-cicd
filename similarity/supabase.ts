/**
 * supabase.ts — Database Layer
 *
 * Handles:
 * - Vector similarity search (pgvector)
 * - Storing validation results
 *
 * Falls back gracefully if Supabase is not configured.
 */

import type { ValidationResult, SimilarIdea } from '../lib/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY!,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

/**
 * Search for similar product ideas using pgvector cosine similarity.
 * Uses Supabase RPC function `match_ideas`.
 */
export async function searchSimilarIdeas(
  embedding: number[],
  limit: number = 5
): Promise<SimilarIdea[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[supabase] Not configured — returning mock similar ideas');
    return mockSimilarIdeas();
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_ideas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query_embedding: embedding, match_count: limit }),
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return data.map((row: {
      id: string;
      idea: string;
      category: string;
      similarity: number;
      demand_score: number;
    }) => ({
      id: row.id,
      idea: row.idea,
      category: row.category,
      similarity: row.similarity,
      demand_score: row.demand_score,
    }));
  } catch (error) {
    console.error('[supabase] searchSimilarIdeas failed:', error);
    return mockSimilarIdeas();
  }
}

/**
 * Store a completed validation result in Supabase.
 */
export async function storeValidation(
  result: ValidationResult,
  embedding: number[]
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[supabase] Not configured — skipping storage');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/validations`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        idea: result.idea,
        category: result.category,
        market: result.market,
        cost: result.cost,
        demand_score: result.demand_score,
        opportunity_score: result.scores.opportunity_score,
        trend_score: result.scores.trend_score,
        trend_stage: result.scores.trend_stage,
        competition_level: result.scores.competition_level,
        confidence: result.scores.confidence,
        verdict: result.verdict,
        suggestions: result.suggestions,
        sentiment_summary: result.sentiment_summary,
        embedding,
        created_at: result.created_at,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  } catch (error) {
    console.error('[supabase] storeValidation failed:', error);
  }
}

// ── Mock Fallback ─────────────────────────────────────────────

function mockSimilarIdeas(): SimilarIdea[] {
  return [
    { id: 'mock-1', idea: 'AI fitness coach app', category: 'Health & Wellness', similarity: 0.87, demand_score: 78 },
    { id: 'mock-2', idea: 'Smart meditation headband', category: 'Wearables', similarity: 0.74, demand_score: 65 },
    { id: 'mock-3', idea: 'Personalized sleep supplement subscription', category: 'Health', similarity: 0.71, demand_score: 82 },
  ];
}
