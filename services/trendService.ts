/**
 * trendService.ts — Trend Detection Service
 *
 * MVP: Simulates time-series trend data based on category + idea signals.
 * Future: Replace with real data from Google Trends API, Reddit scraping,
 *         Twitter/X API, or a managed trend intelligence feed.
 *
 * Extensibility hook: export `fetchRealTrendData(idea, category)` and
 * swap the simulation call in `getTrendData`.
 */

import type { TrendData, TrendStage } from '../lib/types';
import { classifyTrendStage } from '../lib/scoring';

// ── Category Trend Baselines ──────────────────────────────────
// These represent "prior beliefs" about category trend momentum.
// Higher = more mentions growth expected in this space.

const CATEGORY_BASELINES: Record<string, number> = {
  'AI & Machine Learning': 0.82,
  'Health & Wellness':     0.65,
  'Sustainability':        0.70,
  'Wearables':             0.58,
  'EdTech':                0.60,
  'FinTech':               0.55,
  'Food & Beverage':       0.45,
  'Gaming':                0.50,
  'B2B SaaS':              0.68,
  'E-commerce':            0.42,
  'Productivity':          0.63,
  'Home & Living':         0.40,
  'Travel':                0.38,
  'Fashion':               0.35,
  default:                 0.50,
};

// ── Keyword Boost Signals ──────────────────────────────────────
// Specific keywords in the idea string boost or dampen trend score.

const KEYWORD_BOOSTS: { keyword: string; boost: number }[] = [
  { keyword: 'ai',           boost: +0.12 },
  { keyword: 'gpt',          boost: +0.10 },
  { keyword: 'sustainable',  boost: +0.08 },
  { keyword: 'subscription', boost: +0.06 },
  { keyword: 'personalized', boost: +0.07 },
  { keyword: 'remote',       boost: +0.05 },
  { keyword: 'wellness',     boost: +0.06 },
  { keyword: 'blockchain',   boost: -0.08 },
  { keyword: 'crypto',       boost: -0.06 },
  { keyword: 'nft',          boost: -0.12 },
  { keyword: 'legacy',       boost: -0.10 },
];

/**
 * Compute keyword boost from the idea text.
 */
function computeKeywordBoost(idea: string): number {
  const lower = idea.toLowerCase();
  return KEYWORD_BOOSTS.reduce((total, { keyword, boost }) => {
    return total + (lower.includes(keyword) ? boost : 0);
  }, 0);
}

/**
 * Generate a simulated 12-month time series for trend visualization.
 *
 * Uses a base + growth curve with noise to create realistic-looking data.
 */
function generateTimeSeries(
  base: number,
  growth: number,
  months: number = 12
): { month: string; value: number }[] {
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Start 12 months ago
  const today = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;

    // Growth curve: value increases over time based on growth rate
    const progress = (months - i) / months;
    const growthEffect = base * Math.pow(1 + growth, progress * 12 / 12);

    // Add noise: ±8% random variation
    const noise = (Math.random() - 0.5) * 0.16 * growthEffect;

    const value = Math.round(Math.min(100, Math.max(5, growthEffect * 100 + noise)));

    result.push({ month: label, value });
  }

  return result;
}

/**
 * Seeded pseudo-random for consistent results per idea.
 */
function seededRand(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

// ── Main Service Function ──────────────────────────────────────

/**
 * getTrendData
 *
 * Returns simulated trend signals for an idea + category.
 * Deterministic (seeded) for the same input.
 *
 * @future Replace body with: `return fetchRealTrendData(idea, category);`
 */
export async function getTrendData(idea: string, category: string): Promise<TrendData> {
  // Base from category
  const base = CATEGORY_BASELINES[category] ?? CATEGORY_BASELINES.default;

  // Keyword signal
  const keywordBoost = computeKeywordBoost(idea);

  // Seeded randomness for reproducibility
  const seed = `${idea}:${category}`;
  const rand = seededRand(seed);

  // Final mentions growth: base + boost + small random variation
  const mentions_growth = Math.min(1, Math.max(0, base + keywordBoost + (rand - 0.5) * 0.1));

  // Search volume correlates with mentions but has its own noise
  const search_volume = Math.min(1, Math.max(0, mentions_growth * 0.85 + seededRand(seed + 'sv') * 0.2));

  // Trend stage classification
  const trend_stage: TrendStage = classifyTrendStage(mentions_growth);

  // Generate time series
  const monthlyGrowthRate = mentions_growth * 0.08;
  const time_series = generateTimeSeries(0.3, monthlyGrowthRate);

  return {
    mentions_growth,
    search_volume,
    trend_stage,
    time_series,
  };
}

// ── Extensibility Hook ────────────────────────────────────────
// Future: uncomment and implement when real data APIs are available

// export async function fetchRealTrendData(idea: string, category: string): Promise<TrendData> {
//   const [googleTrends, redditMentions, twitterVolume] = await Promise.all([
//     fetchGoogleTrends(idea),
//     fetchRedditMentions(idea),
//     fetchTwitterVolume(idea),
//   ]);
//   // normalize, aggregate, return TrendData
// }
