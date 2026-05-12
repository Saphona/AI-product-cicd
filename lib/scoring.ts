/**
 * scoring.ts — Core Scoring Algorithm (Primary USP)
 *
 * Trend Score Formula:
 *   trend_score = (mentions_growth × 0.3) + (search_volume × 0.3) + (sentiment × 0.2) − (competition × 0.2)
 *
 * Opportunity Score:
 *   Composite of trend score weighted with demand signals
 *
 * All inputs are normalized [0, 1].
 * All outputs are scaled to [0, 100].
 */

import type { ScoreInputs, Scores, TrendStage, CompetitionLevel } from './types';

// ── Constants ─────────────────────────────────────────────────
const WEIGHTS = {
  mentions_growth: 0.30,
  search_volume:   0.30,
  sentiment:       0.20,
  competition:     0.20,  // negative weight
} as const;

// Classification thresholds
const TREND_THRESHOLDS = {
  EARLY:    { min: 0,   max: 0.40 },
  RISING:   { min: 0.40, max: 0.70 },
  SATURATED:{ min: 0.70, max: 1.01 },
} as const;

const COMPETITION_THRESHOLDS = {
  LOW:    { min: 0,    max: 0.35 },
  MEDIUM: { min: 0.35, max: 0.65 },
  HIGH:   { min: 0.65, max: 1.01 },
} as const;

// ── Helpers ───────────────────────────────────────────────────

/** Clamp a value to [min, max] */
function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Normalize to 0–100 and round to 1 decimal */
function toScore(value: number): number {
  return Math.round(clamp(value) * 100 * 10) / 10;
}

/** Classify trend stage using threshold ranges */
function classifyTrendStage(mentions_growth: number): TrendStage {
  const normalized = clamp(mentions_growth);
  for (const [stage, range] of Object.entries(TREND_THRESHOLDS)) {
    if (normalized >= range.min && normalized < range.max) {
      return stage as TrendStage;
    }
  }
  return 'SATURATED';
}

/** Classify competition level */
function classifyCompetition(competition_index: number): CompetitionLevel {
  const normalized = clamp(competition_index);
  for (const [level, range] of Object.entries(COMPETITION_THRESHOLDS)) {
    if (normalized >= range.min && normalized < range.max) {
      return level as CompetitionLevel;
    }
  }
  return 'HIGH';
}

/**
 * Calculate confidence score.
 *
 * Measures internal consistency of the input signals:
 * - Higher when trend + demand + sentiment are aligned
 * - Penalized when signals diverge (high demand but low sentiment, etc.)
 */
function calculateConfidence(inputs: ScoreInputs, trend_raw: number): number {
  const { mentions_growth, search_volume, sentiment, competition } = inputs;

  // Signal consistency: all high signals together = high confidence
  const positiveAlignment = (mentions_growth + search_volume + sentiment) / 3;

  // Penalty for contradiction: high demand but very low sentiment
  const contradiction = Math.abs(positiveAlignment - (1 - competition)) * 0.3;

  // Trend strength contribution
  const trendStrength = clamp(trend_raw) * 0.4;

  const raw = positiveAlignment * 0.4 + trendStrength - contradiction;
  return Math.round(clamp(raw) * 100) / 100;
}

// ── Main Scoring Function ─────────────────────────────────────

/**
 * calculateScore
 *
 * Primary algorithm implementing:
 *   trend_score = (mentions_growth × W1) + (search_volume × W2) + (sentiment × W3) − (competition × W4)
 *
 * @param inputs - Normalized [0,1] signal values
 * @returns Scores object with all classifications and scores
 */
export function calculateScore(inputs: ScoreInputs): Scores {
  const { mentions_growth, search_volume, sentiment, competition } = inputs;

  // ── Step 1: Compute raw trend score (0–1) ──────────────────
  const trend_raw =
    mentions_growth * WEIGHTS.mentions_growth +
    search_volume   * WEIGHTS.search_volume   +
    sentiment       * WEIGHTS.sentiment       -
    competition     * WEIGHTS.competition;

  // ── Step 2: Clamp + scale to 0–100 ────────────────────────
  const trend_score = toScore(trend_raw);

  // ── Step 3: Opportunity score (blend of trend + demand signals) ──
  // Slightly different weighting to emphasize raw market demand
  const opportunity_raw =
    trend_raw * 0.6 +
    search_volume * 0.25 +
    (1 - competition) * 0.15;

  const opportunity_score = toScore(opportunity_raw);

  // ── Step 4: Classify trend stage ──────────────────────────
  const trend_stage = classifyTrendStage(mentions_growth);

  // ── Step 5: Classify competition level ────────────────────
  const competition_level = classifyCompetition(competition);

  // ── Step 6: Calculate confidence ──────────────────────────
  const confidence = calculateConfidence(inputs, trend_raw);

  return {
    trend_score,
    opportunity_score,
    confidence,
    trend_stage,
    competition_level,
  };
}

// ── Utilities (Exported for Testing / UI) ────────────────────

export { classifyTrendStage, classifyCompetition, calculateConfidence };
export { WEIGHTS, TREND_THRESHOLDS, COMPETITION_THRESHOLDS };
