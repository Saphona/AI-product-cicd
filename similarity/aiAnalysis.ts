/**
 * aiAnalysis.ts — Gemini AI Analysis Layer
 *
 * Implements RAG-style prompt construction:
 * - Injects similar ideas as context
 * - Passes scoring data
 * - Returns structured JSON verdict
 */

import type {
  AIAnalysis,
  TrendData,
  SentimentData,
  MarketData,
  SimilarIdea,
  Scores,
  Verdict,
} from '../lib/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

interface AnalysisInput {
  idea: string;
  category: string;
  market: string;
  cost: number;
  similarIdeas: SimilarIdea[];
  trendData: TrendData;
  sentimentData: SentimentData;
  marketData: MarketData;
  scores: Scores;
}

/**
 * Build the RAG-enhanced prompt for Gemini.
 * Injects retrieved context (similar ideas, data) to ground the response.
 */
function buildPrompt(input: AnalysisInput): string {
  const {
    idea, category, market, cost,
    similarIdeas, trendData, sentimentData, marketData, scores,
  } = input;

  const similarContext = similarIdeas.length > 0
    ? similarIdeas.map(s =>
        `- "${s.idea}" (${s.category}) — similarity: ${(s.similarity * 100).toFixed(0)}%, demand score: ${s.demand_score}`
      ).join('\n')
    : '- No closely related validated ideas found';

  return `You are a senior product strategist and market analyst AI. Analyze the following product idea using the data provided.

PRODUCT IDEA: "${idea}"
CATEGORY: ${category}
TARGET MARKET: ${market}
ESTIMATED COST: $${cost}

## RETRIEVED CONTEXT (Similar Validated Ideas):
${similarContext}

## MARKET INTELLIGENCE DATA:
- Trend Stage: ${scores.trend_stage}
- Trend Score: ${scores.trend_score}/100
- Opportunity Score: ${scores.opportunity_score}/100
- Market Sentiment: ${(sentimentData.score * 100).toFixed(0)}% positive
- Competition Level: ${scores.competition_level}
- Market Size: $${(marketData.market_size_usd / 1e9).toFixed(1)}B
- Market Growth Rate: ${marketData.growth_rate_pct}% YoY
- Mentions Growth: ${(trendData.mentions_growth * 100).toFixed(0)}% trend
- Search Volume Index: ${(trendData.search_volume * 100).toFixed(0)}/100
- Confidence: ${(scores.confidence * 100).toFixed(0)}%

## ANALYSIS TASK:
Provide a rigorous, data-backed product validation analysis. Be specific and actionable. Consider the retrieved context of similar products.

Return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "demand_score": <number 0-100>,
  "trend_stage": "${scores.trend_stage}",
  "competition": "${scores.competition_level}",
  "estimated_price": <number in USD, realistic retail price>,
  "profit_margin": <number 0-100, estimated gross margin %>,
  "sentiment_summary": "<2-3 sentence customer sentiment analysis based on the data>",
  "suggestions": [
    "<specific, actionable improvement suggestion 1>",
    "<specific, actionable improvement suggestion 2>",
    "<specific, actionable improvement suggestion 3>",
    "<specific, actionable improvement suggestion 4>"
  ],
  "verdict": "<one of: STRONG_BUY | BUY | HOLD | AVOID>",
  "confidence": ${scores.confidence}
}

Verdict logic:
- STRONG_BUY: High demand, EARLY/RISING trend, LOW competition, positive sentiment
- BUY: Good demand, growing trend, manageable competition
- HOLD: Mixed signals or SATURATED trend with some opportunity
- AVOID: Low demand, HIGH competition, negative outlook`;
}

/**
 * Call Gemini API with the constructed prompt.
 */
export async function analyzeWithAI(input: AnalysisInput): Promise<AIAnalysis> {
  if (!GEMINI_API_KEY) {
    console.warn('[aiAnalysis] GEMINI_API_KEY not set — using mock analysis');
    return mockAnalysis(input);
  }

  try {
    const prompt = buildPrompt(input);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,     // Lower temp for more consistent JSON output
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('Empty response from Gemini');

    // Robustly extract JSON: strip markdown fences, then find the {...} block
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    // Extract the first complete JSON object in case there is surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in Gemini response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      demand_score: parsed.demand_score,
      estimated_price: parsed.estimated_price,
      profit_margin: parsed.profit_margin,
      sentiment_summary: parsed.sentiment_summary,
      suggestions: parsed.suggestions,
      verdict: parsed.verdict as Verdict,
    };
  } catch (error) {
    console.error('[aiAnalysis] Error:', error);
    return mockAnalysis(input);
  }
}

// ── Mock Fallback ─────────────────────────────────────────────

function mockAnalysis(input: AnalysisInput): AIAnalysis {
  const { scores, cost } = input;
  const isGoodOpportunity = scores.opportunity_score > 60;

  const verdictMap: Record<string, Verdict> = {
    HIGH_LOW: 'STRONG_BUY',
    MED_LOW: 'BUY',
    HIGH_MED: 'BUY',
    MED_MED: 'HOLD',
    LOW_ANY: 'HOLD',
    ANY_HIGH: 'AVOID',
  };

  const key = scores.competition_level === 'HIGH' ? 'ANY_HIGH'
    : scores.opportunity_score > 70 && scores.competition_level === 'LOW' ? 'HIGH_LOW'
    : scores.opportunity_score > 55 && scores.competition_level === 'LOW' ? 'MED_LOW'
    : scores.opportunity_score > 70 ? 'HIGH_MED'
    : scores.opportunity_score > 45 ? 'MED_MED'
    : 'LOW_ANY';

  return {
    demand_score: Math.round(scores.opportunity_score * 0.9 + Math.random() * 10),
    estimated_price: Math.round(cost * (isGoodOpportunity ? 3.5 : 2.2)),
    profit_margin: isGoodOpportunity ? 42 : 28,
    sentiment_summary: `Consumer sentiment around this product category is ${isGoodOpportunity ? 'largely positive' : 'mixed'}, with growing interest in AI-enhanced and personalized solutions. Buyers in this space show willingness to pay premium prices for demonstrated quality.`,
    suggestions: [
      'Focus on a narrow beachhead market before expanding — pick one specific user persona and dominate it.',
      'Build a waitlist landing page to validate demand before full development; aim for 500+ sign-ups.',
      `Consider a subscription model instead of one-time purchase to maximize LTV at your $${cost} cost basis.`,
      'Differentiate on customer education — create content that explains the problem your product solves.',
    ],
    verdict: verdictMap[key] ?? 'HOLD',
  };
}