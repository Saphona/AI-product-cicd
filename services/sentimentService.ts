/**
 * sentimentService.ts — Sentiment Analysis Service
 *
 * MVP: Simulates sentiment based on category priors + keyword signals.
 * Future: Replace with NLP model (e.g., fine-tuned BERT, Gemini sentiment API)
 *         or real scraped review data from Reddit, Amazon, App Store.
 *
 * Extensibility hook: export `analyzeSentimentFromText(texts: string[])`
 */

import type { SentimentData } from '../lib/types';

// ── Category Sentiment Priors ─────────────────────────────────
const CATEGORY_SENTIMENT: Record<string, number> = {
  'AI & Machine Learning': 0.74,
  'Health & Wellness':     0.78,
  'Sustainability':        0.82,
  'Wearables':             0.65,
  'EdTech':                0.71,
  'FinTech':               0.58,
  'Food & Beverage':       0.72,
  'Gaming':                0.67,
  'B2B SaaS':              0.64,
  'E-commerce':            0.55,
  'Productivity':          0.70,
  'Home & Living':         0.73,
  'Travel':                0.69,
  'Fashion':               0.62,
  default:                 0.65,
};

// Keyword sentiment modifiers
const SENTIMENT_KEYWORDS: { keyword: string; modifier: number }[] = [
  { keyword: 'pain',       modifier: +0.05 }, // solves a pain = positive reception
  { keyword: 'problem',    modifier: +0.04 },
  { keyword: 'save',       modifier: +0.06 },
  { keyword: 'easy',       modifier: +0.05 },
  { keyword: 'simple',     modifier: +0.04 },
  { keyword: 'affordable', modifier: +0.07 },
  { keyword: 'cheap',      modifier: -0.03 },
  { keyword: 'expensive',  modifier: -0.06 },
  { keyword: 'complex',    modifier: -0.04 },
  { keyword: 'privacy',    modifier: -0.05 },
  { keyword: 'tracking',   modifier: -0.03 },
];

function seededRand(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return (Math.sin(h) * 10000 - Math.floor(Math.sin(h) * 10000));
}

function classifySentiment(score: number): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  if (score >= 0.65) return 'POSITIVE';
  if (score >= 0.40) return 'NEUTRAL';
  return 'NEGATIVE';
}

function buildSummary(label: string, category: string, score: number): string {
  const pct = Math.round(score * 100);
  const summaries: Record<string, string[]> = {
    POSITIVE: [
      `Consumer conversations around ${category} products show strong enthusiasm, with ~${pct}% positive sentiment across major platforms.`,
      `Market reception is warm — buyers associate "${category}" solutions with improved quality of life and are showing intent to purchase.`,
    ],
    NEUTRAL: [
      `Sentiment in the ${category} space is balanced. Consumers are curious but cautious — many are waiting for proven solutions before committing.`,
      `Mixed signals in the market: early adopters are positive, while mainstream buyers remain skeptical and price-sensitive.`,
    ],
    NEGATIVE: [
      `The ${category} category has faced criticism recently, with consumers citing unmet promises and high costs as key pain points.`,
      `Current sentiment is subdued — there's skepticism in the market that a new product would need strong differentiation to overcome.`,
    ],
  };

  const opts = summaries[label];
  return opts[Math.floor(seededRand(category + label) * opts.length)];
}

// ── Main Service Function ──────────────────────────────────────

export async function getSentimentData(idea: string, category: string): Promise<SentimentData> {
  const base = CATEGORY_SENTIMENT[category] ?? CATEGORY_SENTIMENT.default;

  const lower = idea.toLowerCase();
  const keywordModifier = SENTIMENT_KEYWORDS.reduce((sum, { keyword, modifier }) => {
    return sum + (lower.includes(keyword) ? modifier : 0);
  }, 0);

  const rand = seededRand(`${idea}:${category}:sentiment`);
  const noise = (rand - 0.5) * 0.08;

  const score = Math.min(1, Math.max(0, base + keywordModifier + noise));
  const label = classifySentiment(score);
  const summary = buildSummary(label, category, score);

  return { score, label, summary };
}

// ── Extensibility Hook ────────────────────────────────────────
// Future NLP-based sentiment:
//
// export async function analyzeSentimentFromText(texts: string[]): Promise<SentimentData> {
//   const results = await Promise.all(texts.map(text => callSentimentModel(text)));
//   const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
//   return { score: avgScore, label: classifySentiment(avgScore), summary: buildSummary(...) };
// }
