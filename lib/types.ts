// ─────────────────────────────────────────────────────────────
// Core domain types for ProductIQ
// ─────────────────────────────────────────────────────────────

export type TrendStage = 'EARLY' | 'RISING' | 'SATURATED';
export type CompetitionLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Verdict = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';

// ── Input ─────────────────────────────────────────────────────
export interface ValidationInput {
  idea: string;
  category: string;
  market: string;
  cost: number;
}

// ── Service Data ──────────────────────────────────────────────
export interface TrendData {
  mentions_growth: number;       // 0–1 normalized
  search_volume: number;         // 0–1 normalized
  trend_stage: TrendStage;
  time_series: { month: string; value: number }[];
}

export interface SentimentData {
  score: number;                 // 0–1
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  summary: string;
}

export interface MarketData {
  competition_index: number;     // 0–1 (1 = very competitive)
  competition_level: CompetitionLevel;
  market_size_usd: number;
  growth_rate_pct: number;
}

export interface SimilarIdea {
  id: string;
  idea: string;
  category: string;
  similarity: number;            // 0–1 cosine similarity
  demand_score: number;
}

// ── Scoring ───────────────────────────────────────────────────
export interface ScoreInputs {
  mentions_growth: number;
  search_volume: number;
  sentiment: number;
  competition: number;
}

export interface Scores {
  trend_score: number;           // 0–100
  opportunity_score: number;     // 0–100 (final composite)
  confidence: number;            // 0–1
  trend_stage: TrendStage;
  competition_level: CompetitionLevel;
}

// ── AI Output ─────────────────────────────────────────────────
export interface AIAnalysis {
  demand_score: number;          // 0–100
  sentiment_summary: string;
  suggestions: string[];
  verdict: Verdict;
  estimated_price: number;
  profit_margin: number;
}

// ── Full Result ───────────────────────────────────────────────
export interface ValidationResult extends AIAnalysis {
  idea: string;
  category: string;
  market: string;
  cost: number;
  scores: Scores;
  trendData: TrendData;
  sentimentData: SentimentData;
  marketData: MarketData;
  similarIdeas: SimilarIdea[];
  created_at: string;
}
