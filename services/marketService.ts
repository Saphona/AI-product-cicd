/**
 * marketService.ts — Market Intelligence Service
 *
 * MVP: Simulates market size, competition, and growth data.
 * Future: Connect to market research APIs (Statista, IBISWorld, SimilarWeb,
 *         or a custom scraping pipeline for competitor analysis).
 */

import type { MarketData, CompetitionLevel } from '../lib/types';
import { classifyCompetition } from '../lib/scoring';

// ── Market Data Registry ──────────────────────────────────────
// Approximate real-world figures (in USD billions) for known categories.

const MARKET_REGISTRY: Record<string, { size_usd_bn: number; growth_pct: number; competition: number }> = {
  'AI & Machine Learning': { size_usd_bn: 184,  growth_pct: 37.3, competition: 0.72 },
  'Health & Wellness':     { size_usd_bn: 4500, growth_pct: 5.9,  competition: 0.55 },
  'Wearables':             { size_usd_bn: 116,  growth_pct: 14.6, competition: 0.68 },
  'EdTech':                { size_usd_bn: 252,  growth_pct: 16.3, competition: 0.60 },
  'FinTech':               { size_usd_bn: 340,  growth_pct: 23.4, competition: 0.75 },
  'Food & Beverage':       { size_usd_bn: 8900, growth_pct: 3.2,  competition: 0.80 },
  'Gaming':                { size_usd_bn: 217,  growth_pct: 8.7,  competition: 0.78 },
  'B2B SaaS':              { size_usd_bn: 195,  growth_pct: 18.7, competition: 0.65 },
  'E-commerce':            { size_usd_bn: 6310, growth_pct: 9.1,  competition: 0.82 },
  'Productivity':          { size_usd_bn: 87,   growth_pct: 14.2, competition: 0.58 },
  'Home & Living':         { size_usd_bn: 754,  growth_pct: 4.8,  competition: 0.62 },
  'Sustainability':        { size_usd_bn: 385,  growth_pct: 22.6, competition: 0.42 },
  'Travel':                { size_usd_bn: 1765, growth_pct: 12.1, competition: 0.70 },
  'Fashion':               { size_usd_bn: 1700, growth_pct: 5.6,  competition: 0.85 },
};

const DEFAULT_MARKET = { size_usd_bn: 150, growth_pct: 10.0, competition: 0.55 };

// ── Regional Adjustment Factors ───────────────────────────────
// Adjusts competition based on target market maturity.

const REGION_FACTORS: Record<string, { competition_delta: number; size_factor: number }> = {
  'United States':    { competition_delta: +0.10, size_factor: 1.0 },
  'Europe':           { competition_delta: +0.05, size_factor: 0.85 },
  'Asia-Pacific':     { competition_delta: +0.08, size_factor: 1.2 },
  'India':            { competition_delta: -0.05, size_factor: 0.7 },
  'Latin America':    { competition_delta: -0.08, size_factor: 0.6 },
  'Middle East':      { competition_delta: -0.10, size_factor: 0.5 },
  'Africa':           { competition_delta: -0.15, size_factor: 0.4 },
  'Southeast Asia':   { competition_delta: -0.03, size_factor: 0.75 },
  'Global':           { competition_delta: +0.02, size_factor: 1.0 },
};

const DEFAULT_REGION = { competition_delta: 0, size_factor: 1.0 };

function seededRand(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return (Math.sin(h) * 10000 - Math.floor(Math.sin(h) * 10000));
}

// ── Main Service Function ──────────────────────────────────────

export async function getMarketData(idea: string, market: string): Promise<MarketData> {
  // Look up the category — we'll infer from idea keywords if needed
  const category = inferCategory(idea);
  const registry = MARKET_REGISTRY[category] ?? DEFAULT_MARKET;
  const regionFactor = REGION_FACTORS[market] ?? DEFAULT_REGION;

  // Noise for variation
  const noise = (seededRand(`${idea}:${market}`) - 0.5) * 0.08;

  // Competition index with regional adjustment + noise
  const competition_index = Math.min(1, Math.max(0,
    registry.competition + regionFactor.competition_delta + noise
  ));

  const competition_level: CompetitionLevel = classifyCompetition(competition_index);

  // Market size adjusted by region
  const market_size_usd = Math.round(registry.size_usd_bn * regionFactor.size_factor * 1e9);

  // Growth rate with small noise
  const growth_noise = (seededRand(`${idea}:${market}:growth`) - 0.5) * 2;
  const growth_rate_pct = Math.round((registry.growth_pct + growth_noise) * 10) / 10;

  return {
    competition_index,
    competition_level,
    market_size_usd,
    growth_rate_pct,
  };
}

/**
 * Infer category from idea text for market lookup.
 * Simple keyword matching — future: use embeddings for this.
 */
function inferCategory(idea: string): string {
  const lower = idea.toLowerCase();
  const mappings: { keywords: string[]; category: string }[] = [
    { keywords: ['ai', 'ml', 'machine learning', 'gpt', 'llm'], category: 'AI & Machine Learning' },
    { keywords: ['health', 'wellness', 'fitness', 'sleep', 'nutrition'], category: 'Health & Wellness' },
    { keywords: ['watch', 'wearable', 'band', 'tracker'], category: 'Wearables' },
    { keywords: ['learn', 'course', 'tutor', 'education', 'skill'], category: 'EdTech' },
    { keywords: ['payment', 'finance', 'banking', 'invest', 'crypto'], category: 'FinTech' },
    { keywords: ['food', 'meal', 'recipe', 'restaurant', 'diet'], category: 'Food & Beverage' },
    { keywords: ['game', 'gaming', 'play', 'esport'], category: 'Gaming' },
    { keywords: ['saas', 'b2b', 'enterprise', 'api', 'dashboard'], category: 'B2B SaaS' },
    { keywords: ['shop', 'ecommerce', 'store', 'marketplace'], category: 'E-commerce' },
    { keywords: ['productivity', 'task', 'note', 'todo', 'workflow'], category: 'Productivity' },
    { keywords: ['sustainable', 'green', 'eco', 'carbon'], category: 'Sustainability' },
    { keywords: ['travel', 'trip', 'hotel', 'flight', 'vacation'], category: 'Travel' },
    { keywords: ['fashion', 'clothing', 'style', 'wardrobe'], category: 'Fashion' },
  ];

  for (const { keywords, category } of mappings) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }

  return 'default';
}
