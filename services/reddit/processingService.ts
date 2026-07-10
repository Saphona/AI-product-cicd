/**
 * processingService.ts
 *
 * Turns raw Reddit posts into searchable vector chunks.
 *
 * Chunking strategy: Semantic chunking
 *   One chunk = post title + body + top comments
 *   This preserves full context (a "wish" post without its comments loses meaning)
 *
 * Pipeline:
 *   RedditPost → buildChunkText() → generateEmbedding() → storeSignal()
 */

import { generateEmbedding } from '../../lib/embeddings';
import type { RedditPost, SignalTier } from './scraperService';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Types ─────────────────────────────────────────────────────

export interface RedditSignal {
  id?:          string;
  post_id:      string;
  subreddit:    string;
  title:        string;
  body:         string;
  top_comments: string[];
  upvotes:      number;
  tier:         SignalTier;
  demand_score: number;
  chunk_text:   string;   // what gets embedded
  embedding?:   number[];
  url:          string;
  created_at:   string;
  scraped_at:   string;
}

// ── Semantic chunk builder ─────────────────────────────────────
//
// Strategy: "Context-preserving chunk"
// We don't split — one post = one chunk.
// The chunk text is structured to maximize semantic signal:
//   [TITLE] ... [BODY snippet] ... [REACTIONS: comment1 | comment2]
//
// Why this beats fixed-size chunking:
//   A post saying "I wish this existed" means nothing without context.
//   The body + comments clarify WHAT they wish for and HOW MUCH they want it.

export function buildChunkText(post: RedditPost): string {
  const parts: string[] = [];

  // Title carries the most signal
  parts.push(post.title.trim());

  // Body (trimmed — we only need the core meaning, not full post)
  if (post.body && post.body.trim().length > 20) {
    parts.push(post.body.trim().slice(0, 400));
  }

  // Top comments add social validation signal
  if (post.top_comments.length > 0) {
    const commentSummary = post.top_comments
      .slice(0, 3)
      .map(c => c.trim().slice(0, 150))
      .join(' | ');
    parts.push(`Community reactions: ${commentSummary}`);
  }

  // Add subreddit context (e.g. "r/productivity" signals context to the embedding)
  parts.push(`[r/${post.subreddit}]`);

  return parts.join('\n').trim();
}

// ── Store to Supabase ────────────────────────────────────────

async function upsertSignal(signal: RedditSignal): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  await fetch(`${SUPABASE_URL}/rest/v1/reddit_signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates', // upsert on post_id
    },
    body: JSON.stringify({
      post_id:      signal.post_id,
      subreddit:    signal.subreddit,
      title:        signal.title,
      body:         signal.body,
      top_comments: signal.top_comments,
      upvotes:      signal.upvotes,
      tier:         signal.tier,
      demand_score: signal.demand_score,
      chunk_text:   signal.chunk_text,
      embedding:    signal.embedding,
      url:          signal.url,
      created_at:   signal.created_at,
      scraped_at:   signal.scraped_at,
    }),
  }).catch(e => console.error('[processing] upsert failed:', e));
}

// ── Main export ───────────────────────────────────────────────

/**
 * processAndStorePosts
 *
 * Takes raw scraped posts, builds chunk text, generates embeddings,
 * and stores everything in Supabase reddit_signals table.
 *
 * Processes in batches of 5 to avoid Gemini rate limits.
 */
export async function processAndStorePosts(posts: RedditPost[]): Promise<RedditSignal[]> {
  const signals: RedditSignal[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);

    const processed = await Promise.all(
      batch.map(async (post): Promise<RedditSignal> => {
        const chunk_text = buildChunkText(post);
        const embedding  = await generateEmbedding(chunk_text);

        return {
          post_id:      post.post_id,
          subreddit:    post.subreddit,
          title:        post.title,
          body:         post.body,
          top_comments: post.top_comments,
          upvotes:      post.upvotes,
          tier:         post.tier,
          demand_score: post.demand_score,
          chunk_text,
          embedding,
          url:          post.url,
          created_at:   post.created_at,
          scraped_at:   new Date().toISOString(),
        };
      })
    );

    // Store batch
    await Promise.all(processed.map(upsertSignal));
    signals.push(...processed);

    // Rate limit delay between embedding batches
    if (i + BATCH_SIZE < posts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return signals;
}

/**
 * queryRedditSignals
 *
 * Vector similarity search against stored Reddit signals.
 * Returns the top-k most semantically similar posts to the given idea.
 * Used in the validation pipeline as real RAG context.
 */
export async function queryRedditSignals(
  ideaEmbedding: number[],
  limit = 10,
  minSimilarity = 0.55
): Promise<(RedditSignal & { similarity: number })[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_reddit_signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: ideaEmbedding,
        match_count:     limit,
        min_similarity:  minSimilarity,
      }),
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * aggregateSignalsToMetrics
 *
 * Takes matched Reddit signals and computes real trend + sentiment metrics
 * to replace the simulated values in trendService and sentimentService.
 */
export function aggregateSignalsToMetrics(
  signals: (RedditSignal & { similarity: number })[]
): {
  mentions_growth: number;
  sentiment_score: number;
  reddit_post_count: number;
  top_posts: { title: string; url: string; upvotes: number; tier: SignalTier }[];
} {
  if (signals.length === 0) {
    return {
      mentions_growth:   0,
      sentiment_score:   0.5,
      reddit_post_count: 0,
      top_posts:         [],
    };
  }

  // mentions_growth: weighted average of demand_score × similarity
  const totalWeight = signals.reduce((s, r) => s + r.similarity, 0);
  const mentions_growth = signals.reduce((s, r) => s + r.demand_score * r.similarity, 0) / totalWeight;

  // sentiment: HIGH tier posts = positive signal, weight by upvotes
  const tierScore: Record<SignalTier, number> = { HIGH: 1.0, MEDIUM: 0.65, LOW: 0.35 };
  const sentimentNumerator   = signals.reduce((s, r) => s + tierScore[r.tier] * Math.log10(r.upvotes + 1), 0);
  const sentimentDenominator = signals.reduce((s, r) => s + Math.log10(r.upvotes + 1), 0);
  const sentiment_score = sentimentDenominator > 0
    ? Math.min(1, sentimentNumerator / sentimentDenominator)
    : 0.5;

  const top_posts = signals
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 5)
    .map(r => ({ title: r.title, url: r.url, upvotes: r.upvotes, tier: r.tier }));

  return {
    mentions_growth: Math.min(1, mentions_growth),
    sentiment_score: Math.min(1, sentiment_score),
    reddit_post_count: signals.length,
    top_posts,
  };
}