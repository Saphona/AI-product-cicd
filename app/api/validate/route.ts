/**
 * app/api/validate/route.ts — Product Validation API Endpoint
 *
 * Pipeline:
 *   1. Generate embedding for the idea
 *   2. Search Supabase for similar ideas (vector similarity)
 *   3. Fetch trend, sentiment, market data in parallel
 *   4. Calculate scores
 *   5. Run AI analysis (Gemini)
 *   6. Store result in Supabase
 *   7. Return full ValidationResult to client
 */

import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { calculateScore } from '@/lib/scoring';
import { getTrendData } from '@/services/trendService';
import { getSentimentData } from '@/services/sentimentService';
import { getMarketData } from '@/services/marketService';
import { searchSimilarIdeas, storeValidation } from '@/similarity/supabase';
import { analyzeWithAI } from '@/similarity/aiAnalysis';
import type { ValidationResult } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idea, category, market, cost } = body;

    // Basic validation
    if (!idea || !category || !market || cost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: idea, category, market, cost' },
        { status: 400 }
      );
    }

    // ── Step 1: Generate embedding ────────────────────────────
    const embedding = await generateEmbedding(`${idea} ${category} ${market}`);

    // ── Step 2: Search similar ideas ─────────────────────────
    const similarIdeas = await searchSimilarIdeas(embedding, 5);

    // ── Step 3: Fetch data in parallel ────────────────────────
    const [trendData, sentimentData, marketData] = await Promise.all([
      getTrendData(idea, category),
      getSentimentData(idea, category),
      getMarketData(idea, market),
    ]);

    // ── Step 4: Calculate scores ──────────────────────────────
    const scores = calculateScore({
      mentions_growth: trendData.mentions_growth,
      search_volume: trendData.search_volume,
      sentiment: sentimentData.score,
      competition: marketData.competition_index,
    });

    // ── Step 5: AI analysis ───────────────────────────────────
    const aiAnalysis = await analyzeWithAI({
      idea,
      category,
      market,
      cost,
      similarIdeas,
      trendData,
      sentimentData,
      marketData,
      scores,
    });

    // ── Step 6: Assemble result ───────────────────────────────
    const result: ValidationResult = {
      idea,
      category,
      market,
      cost,
      scores,
      trendData,
      sentimentData,
      marketData,
      similarIdeas,
      demand_score: aiAnalysis.demand_score,
      estimated_price: aiAnalysis.estimated_price,
      profit_margin: aiAnalysis.profit_margin,
      sentiment_summary: aiAnalysis.sentiment_summary,
      suggestions: aiAnalysis.suggestions,
      verdict: aiAnalysis.verdict,
      created_at: new Date().toISOString(),
    };

    // ── Step 7: Store (non-blocking) ──────────────────────────
    storeValidation(result, embedding).catch((err) =>
      console.error('[api/validate] storeValidation error:', err)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/validate] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}