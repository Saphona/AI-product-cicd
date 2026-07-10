/**
 * scraperService.ts
 *
 * Scrapes Reddit posts matching demand-signal keywords.
 *
 * Strategy:
 *  1. Reddit JSON API  (/r/{sub}/search.json) — fast, no browser needed
 *  2. Puppeteer fallback — when Reddit blocks the JSON API (rare)
 *
 * Keyword tiers:
 *  HIGH   — direct demand ("i wish this existed", "why doesn't this exist")
 *  MEDIUM — purchase intent ("i would pay for", "looking for a tool that")
 *  LOW    — latent interest ("would be cool if", "anyone else want")
 */

// ── Keyword tiers ─────────────────────────────────────────────

export type SignalTier = 'HIGH' | 'MEDIUM' | 'LOW';

export const DEMAND_KEYWORDS: { phrase: string; tier: SignalTier; weight: number }[] = [
  // HIGH — direct wish signals
  { phrase: 'i wish this existed',       tier: 'HIGH',   weight: 1.0 },
  { phrase: 'why doesn\'t this exist',   tier: 'HIGH',   weight: 1.0 },
  { phrase: 'someone needs to build',    tier: 'HIGH',   weight: 0.95 },
  { phrase: 'somebody should make',      tier: 'HIGH',   weight: 0.95 },
  { phrase: 'wish this app existed',     tier: 'HIGH',   weight: 0.90 },
  { phrase: 'wish this product existed', tier: 'HIGH',   weight: 0.90 },
  { phrase: 'why is there no app',       tier: 'HIGH',   weight: 0.85 },
  { phrase: 'why isn\'t there a',        tier: 'HIGH',   weight: 0.85 },
  { phrase: 'someone should make this',  tier: 'HIGH',   weight: 0.90 },
  { phrase: 'i need an app that',        tier: 'HIGH',   weight: 0.85 },

  // MEDIUM — purchase intent
  { phrase: 'i would pay for',           tier: 'MEDIUM', weight: 0.80 },
  { phrase: 'i\'d pay for',              tier: 'MEDIUM', weight: 0.80 },
  { phrase: 'does anyone know an app',   tier: 'MEDIUM', weight: 0.75 },
  { phrase: 'looking for a tool that',   tier: 'MEDIUM', weight: 0.75 },
  { phrase: 'is there an app that',      tier: 'MEDIUM', weight: 0.70 },
  { phrase: 'any app that can',          tier: 'MEDIUM', weight: 0.70 },
  { phrase: 'recommend a product for',   tier: 'MEDIUM', weight: 0.65 },

  // LOW — latent interest
  { phrase: 'would be cool if',          tier: 'LOW',    weight: 0.50 },
  { phrase: 'this would be useful',      tier: 'LOW',    weight: 0.45 },
  { phrase: 'anyone else want',          tier: 'LOW',    weight: 0.45 },
  { phrase: 'it would be nice if',       tier: 'LOW',    weight: 0.40 },
];

// ── Types ─────────────────────────────────────────────────────

export interface RedditPost {
  post_id:      string;
  subreddit:    string;
  title:        string;
  body:         string;
  top_comments: string[];
  upvotes:      number;
  tier:         SignalTier;
  demand_score: number;
  url:          string;
  created_at:   string;
}

interface RedditAPIChild {
  data: {
    id: string;
    subreddit: string;
    title: string;
    selftext: string;
    score: number;
    permalink: string;
    created_utc: number;
  };
}

// ── Tier weight multipliers for demand_score ──────────────────
const TIER_MULTIPLIER: Record<SignalTier, number> = {
  HIGH:   1.0,
  MEDIUM: 0.65,
  LOW:    0.35,
};

function computeDemandScore(upvotes: number, tier: SignalTier): number {
  // Log scale for upvotes (so 10k upvotes isn't 1000× better than 10)
  const upvoteSignal = Math.log10(Math.max(upvotes, 1)) / 4; // normalised 0–1 (4 = log10(10000))
  return Math.min(1, upvoteSignal * TIER_MULTIPLIER[tier]);
}

function detectTier(text: string): SignalTier | null {
  const lower = text.toLowerCase();
  for (const { phrase, tier } of DEMAND_KEYWORDS) {
    if (lower.includes(phrase)) return tier;
  }
  return null;
}

// ── Layer 1: Reddit JSON API ──────────────────────────────────

async function fetchSubredditPosts(
  subreddit: string,
  keyword: string,
  limit = 25
): Promise<RedditAPIChild[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json`
    + `?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=top&t=year&limit=${limit}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ProductIQ-Bot/1.0 (research tool)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Reddit API ${res.status}`);

  const data = await res.json();
  return data?.data?.children ?? [];
}

// ── Layer 2: Puppeteer fallback ───────────────────────────────
// Only imported dynamically to avoid bundling when not needed.

async function fetchWithPuppeteer(subreddit: string, keyword: string): Promise<RedditPost[]> {
  try {
    // Dynamic import — puppeteer must be installed: npm install puppeteer
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (compatible; research bot)');
    await page.goto(
      `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=top`,
      { waitUntil: 'networkidle2', timeout: 15000 }
    );

    const posts = await page.evaluate(() => {
      const items: { title: string; upvotes: string; url: string }[] = [];
      document.querySelectorAll('article, [data-testid="post-container"]').forEach(el => {
        const title   = el.querySelector('h3, [data-click-id="body"] h3')?.textContent ?? '';
        const upvotes = el.querySelector('[id*="vote-arrows"]')?.textContent ?? '0';
        const link    = el.querySelector('a[data-click-id="body"]') as HTMLAnchorElement;
        if (title) items.push({ title, upvotes, url: link?.href ?? '' });
      });
      return items.slice(0, 20);
    });

    await browser.close();

    return posts
      .map(p => {
        const tier = detectTier(p.title);
        if (!tier) return null;
        const upvotes = parseInt(p.upvotes.replace(/[^0-9]/g, '')) || 0;
        return {
          post_id:      p.url.split('/comments/')[1]?.split('/')[0] ?? Math.random().toString(36).slice(2),
          subreddit,
          title:        p.title,
          body:         '',
          top_comments: [],
          upvotes,
          tier,
          demand_score: computeDemandScore(upvotes, tier),
          url:          p.url,
          created_at:   new Date().toISOString(),
        } as RedditPost;
      })
      .filter(Boolean) as RedditPost[];
  } catch {
    return [];
  }
}

// ── Fetch top comments for a post ────────────────────────────

async function fetchTopComments(permalink: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com${permalink}.json?limit=5&depth=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ProductIQ-Bot/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const comments = data?.[1]?.data?.children ?? [];
    return comments
      .filter((c: { kind: string; data: { body: string } }) => c.kind === 't1' && c.data.body !== '[deleted]')
      .map((c: { data: { body: string } }) => c.data.body.slice(0, 300))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────

/**
 * scrapeSubreddit
 *
 * Scrapes a single subreddit for demand-signal posts matching an idea.
 * Uses Reddit JSON API first, Puppeteer as fallback.
 * Only returns posts that match at least one demand keyword tier.
 */
export async function scrapeSubreddit(
  subreddit: string,
  idea: string,
  fetchComments = false
): Promise<RedditPost[]> {
  const results: RedditPost[] = [];
  const seen = new Set<string>();

  // Run searches for HIGH + MEDIUM tier keywords only (LOW is too noisy)
  const searchPhrases = DEMAND_KEYWORDS
    .filter(k => k.tier !== 'LOW')
    .slice(0, 5) // limit API calls
    .map(k => k.phrase);

  for (const phrase of searchPhrases) {
    try {
      const children = await fetchSubredditPosts(subreddit, `${phrase} ${idea}`, 10);

      for (const child of children) {
        const { id, title, selftext, score, permalink, created_utc } = child.data;
        if (seen.has(id)) continue;

        const fullText = `${title} ${selftext}`;
        const tier = detectTier(fullText);
        if (!tier) continue; // skip posts that don't match any demand keyword

        seen.add(id);

        const comments = fetchComments
          ? await fetchTopComments(permalink)
          : [];

        results.push({
          post_id:      id,
          subreddit,
          title,
          body:         selftext.slice(0, 500),
          top_comments: comments,
          upvotes:      score,
          tier,
          demand_score: computeDemandScore(score, tier),
          url:          `https://reddit.com${permalink}`,
          created_at:   new Date(created_utc * 1000).toISOString(),
        });
      }
    } catch {
      // If JSON API fails for this phrase, continue to next
      continue;
    }
  }

  // If JSON API returned nothing, try Puppeteer
  if (results.length === 0) {
    const puppeteerResults = await fetchWithPuppeteer(subreddit, idea);
    results.push(...puppeteerResults);
  }

  // Sort by demand_score descending
  return results.sort((a, b) => b.demand_score - a.demand_score);
}

/**
 * scrapeMultipleSubreddits
 *
 * Runs scrapeSubreddit across multiple subreddits with concurrency control.
 * Max 3 concurrent requests to avoid rate limiting.
 */
export async function scrapeMultipleSubreddits(
  subreddits: string[],
  idea: string,
  fetchComments = false
): Promise<RedditPost[]> {
  const CONCURRENCY = 3;
  const all: RedditPost[] = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < subreddits.length; i += CONCURRENCY) {
    const batch = subreddits.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(sub => scrapeSubreddit(sub, idea, fetchComments))
    );

    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }

    // Polite delay between batches
    if (i + CONCURRENCY < subreddits.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Dedupe by post_id
  const seen = new Set<string>();
  return all.filter(p => {
    if (seen.has(p.post_id)) return false;
    seen.add(p.post_id);
    return true;
  });
}