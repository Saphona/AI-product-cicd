import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { searchSimilarIdeas, storeValidation } from '@/similarity/supabase';
import { getTrendData } from '@/services/trendService';
import { getSentimentData } from '@/services/sentimentService';
import { getMarketData } from '@/services/marketService';
import { getSubredditsForCategory } from '@/services/reddit/discoveryService';
import { scrapeMultipleSubreddits } from '@/services/reddit/scraperService';
import { processAndStorePosts } from '@/services/reddit/processingService';
import { calculateScore } from '@/lib/scoring';
import { analyzeWithAI } from '@/similarity/aiAnalysis';
import type { ValidationResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, category, market, cost } = body;

    if (!idea || !category || !market) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Generate embedding
    const embedding = await generateEmbedding(idea);

    // Step 2: Vector search for similar ideas
    const similarIdeas = await searchSimilarIdeas(embedding, 5);

    // Step 3a: Background Reddit scrape (non-blocking — enriches future queries)
    getSubredditsForCategory(idea, category)
      .then(subs => scrapeMultipleSubreddits(subs.slice(0, 5), idea, false))
      .then(posts => processAndStorePosts(posts))
      .catch(() => {}); // fire and forget — never blocks the response

    // Step 3b: Gather signals — pass embedding so services use real Reddit data if available
    const [trendData, sentimentData, marketData] = await Promise.all([
      getTrendData(idea, category, embedding),
      getSentimentData(idea, category, embedding),
      getMarketData(idea, market),
    ]);

    // Step 4: Calculate scoring
    const scores = calculateScore({
      mentions_growth: trendData.mentions_growth,
      search_volume: trendData.search_volume,
      sentiment: sentimentData.score,
      competition: marketData.competition_index,
    });

    // Step 5: AI Analysis (Gemini)
    const aiResult = await analyzeWithAI({
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

    // Step 6: Build final result
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
      ...aiResult,
      created_at: new Date().toISOString(),
    };

    // Step 7: Store in Supabase (fire-and-forget)
    storeValidation(result, embedding).catch(console.error);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}