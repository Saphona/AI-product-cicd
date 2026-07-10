/**
 * discoveryService.ts
 *
 * Finds relevant subreddits for a given category + idea using:
 * Layer 1 — Google search (site:reddit.com)
 * Layer 2 — Reddit's own /search.json?type=sr
 *
 * Results are cached in Supabase subreddit_registry table.
 * Falls back to a hardcoded category map if both layers fail.
 */

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERPAPI_KEY      = process.env.SERPAPI_KEY; // optional — for Google search layer

// ── Fallback registry ─────────────────────────────────────────
// Curated high-signal subreddits per category.
// Used when API discovery fails or on first run.

export const CATEGORY_SUBREDDITS: Record<string, string[]> = {
  'AI & Machine Learning': ['MachineLearning', 'artificial', 'ChatGPT', 'singularity', 'OpenAI', 'LocalLLaMA'],
  'Health & Wellness':     ['selfimprovement', 'LifeProTips', 'sleep', 'Fitness', 'nutrition', 'mentalhealth'],
  'Wearables':             ['wearables', 'Garmin', 'AppleWatch', 'QuantifiedSelf', 'gadgets'],
  'EdTech':                ['learnprogramming', 'education', 'GetStudying', 'OnlineLearning', 'teachers'],
  'FinTech':               ['personalfinance', 'financialindependence', 'investing', 'Frugal', 'povertyfinance'],
  'Food & Beverage':       ['MealPrepSunday', 'EatCheapAndHealthy', 'Cooking', 'food', 'mealplan'],
  'Gaming':                ['gaming', 'patientgamers', 'indiegaming', 'gamedev', 'SteamDeals'],
  'B2B SaaS':              ['SaaS', 'entrepreneur', 'startups', 'smallbusiness', 'remotework'],
  'E-commerce':            ['ecommerce', 'shopify', 'Entrepreneur', 'Flipping', 'AmazonSeller'],
  'Productivity':          ['productivity', 'getdisciplined', 'nosurf', 'ADHD', 'ObsidianMD'],
  'Sustainability':        ['ZeroWaste', 'sustainability', 'environment', 'Anticonsumption', 'EcoFriendly'],
  'Home & Living':         ['HomeImprovement', 'InteriorDesign', 'malelivingspace', 'IKEA', 'minimalism'],
  'Travel':                ['solotravel', 'travel', 'digitalnomad', 'shoestring', 'backpacking'],
  'Fashion':               ['femalefashionadvice', 'malefashionadvice', 'frugalmalefashion', 'streetwear'],
  default:                 ['SideProject', 'Entrepreneur', 'startups', 'SomebodyMakeThis', 'needaproduct'],
};

export interface DiscoveredSubreddit {
  subreddit: string;
  subscribers?: number;
  relevance: number;
  source: 'fallback' | 'reddit_api' | 'google';
}

// ── Layer 2: Reddit search API ────────────────────────────────

async function searchRedditSubreddits(query: string): Promise<DiscoveredSubreddit[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=sr&limit=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ProductIQ-Bot/1.0 (research tool)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const children = data?.data?.children ?? [];

    return children.map((c: {
      data: { display_name: string; subscribers: number; public_description: string }
    }) => ({
      subreddit:   c.data.display_name,
      subscribers: c.data.subscribers,
      relevance:   0.7,
      source:      'reddit_api' as const,
    }));
  } catch {
    return [];
  }
}

// ── Layer 1: Google via SerpAPI (optional) ────────────────────

async function searchGoogleForSubreddits(idea: string, category: string): Promise<DiscoveredSubreddit[]> {
  if (!SERPAPI_KEY) return [];

  try {
    const q = `site:reddit.com "i wish" OR "someone should build" ${idea} ${category}`;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${SERPAPI_KEY}&num=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.organic_results ?? [];

    // Extract subreddit names from URLs like reddit.com/r/ProductIdeas/...
    const seen = new Set<string>();
    const found: DiscoveredSubreddit[] = [];

    for (const r of results) {
      const match = (r.link as string)?.match(/reddit\.com\/r\/([^/]+)/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        found.push({ subreddit: match[1], relevance: 0.9, source: 'google' });
      }
    }

    return found;
  } catch {
    return [];
  }
}

// ── Cache: store discovered subreddits in Supabase ────────────

async function cacheSubreddits(category: string, subreddits: DiscoveredSubreddit[]): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const rows = subreddits.map(s => ({
    subreddit:    s.subreddit,
    category,
    subscribers:  s.subscribers ?? null,
    relevance:    s.relevance,
    last_scraped: null,
  }));

  await fetch(`${SUPABASE_URL}/rest/v1/subreddit_registry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  }).catch(() => {}); // fire and forget
}

async function getCachedSubreddits(category: string): Promise<string[] | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subreddit_registry?category=eq.${encodeURIComponent(category)}&order=relevance.desc&limit=15`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const data: { subreddit: string }[] = await res.json();
    return data.length > 0 ? data.map(d => d.subreddit) : null;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────

/**
 * getSubredditsForCategory
 *
 * Returns a list of subreddits to scrape for a given category + idea.
 * Priority: Supabase cache → Reddit API → Google → fallback map.
 */
export async function getSubredditsForCategory(
  idea: string,
  category: string
): Promise<string[]> {
  // 1. Check Supabase cache first
  const cached = await getCachedSubreddits(category);
  if (cached && cached.length >= 5) return cached;

  // 2. Run discovery layers in parallel
  const [redditResults, googleResults] = await Promise.all([
    searchRedditSubreddits(`${idea} ${category}`),
    searchGoogleForSubreddits(idea, category),
  ]);

  // 3. Merge + dedupe, google results rank higher
  const seen = new Set<string>();
  const merged: DiscoveredSubreddit[] = [];

  for (const r of [...googleResults, ...redditResults]) {
    if (!seen.has(r.subreddit.toLowerCase())) {
      seen.add(r.subreddit.toLowerCase());
      merged.push(r);
    }
  }

  // 4. Always include fallback subs (not already in list)
  const fallback = CATEGORY_SUBREDDITS[category] ?? CATEGORY_SUBREDDITS.default;
  for (const sub of fallback) {
    if (!seen.has(sub.toLowerCase())) {
      merged.push({ subreddit: sub, relevance: 0.5, source: 'fallback' });
    }
  }

  // 5. Cache discovered results
  if (merged.length > 0) {
    cacheSubreddits(category, merged);
  }

  return merged.map(r => r.subreddit).slice(0, 15);
}