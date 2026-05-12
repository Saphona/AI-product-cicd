/**
 * app/api/chat/route.ts
 * Conversational product intelligence endpoint.
 * Accepts a message history and current validation context,
 * returns a streamed AI response with optional re-validation trigger.
 */

import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { calculateScore } from '@/lib/scoring';
import { getTrendData } from '@/services/trendService';
import { getSentimentData } from '@/services/sentimentService';
import { getMarketData } from '@/services/marketService';
import { searchSimilarIdeas, storeValidation } from '@/similarity/supabase';
import { analyzeWithAI } from '@/similarity/aiAnalysis';
import type { ValidationResult } from '@/lib/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Detect if the user's message contains a pivot / new idea to validate.
 * Returns extracted fields if found, null otherwise.
 */
function extractValidationIntent(message: string): {
  idea?: string;
  category?: string;
  market?: string;
  cost?: number;
} | null {
  const lower = message.toLowerCase();
  const pivotKeywords = ['what about', 'how about', 'instead', 'pivot', 'try', 'validate', 'analyze', 'what if', 'consider'];
  const hasPivot = pivotKeywords.some(k => lower.includes(k));
  if (!hasPivot && lower.split(' ').length < 8) return null;

  // Simple heuristic: if message is substantial and mentions a product/idea
  const ideaKeywords = ['app', 'platform', 'product', 'service', 'tool', 'saas', 'marketplace', 'ai', 'startup', 'idea'];
  const hasIdea = ideaKeywords.some(k => lower.includes(k));
  if (!hasIdea) return null;

  return { idea: message };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      currentValidation,
      idea,
      category,
      market,
      cost,
      revalidate,
    }: {
      messages: ChatMessage[];
      currentValidation?: ValidationResult | null;
      idea?: string;
      category?: string;
      market?: string;
      cost?: number;
      revalidate?: boolean;
    } = body;

    // ── Re-validate path ──────────────────────────────────────
    if (revalidate && idea && category && market) {
      const embedding = await generateEmbedding(`${idea} ${category} ${market}`);
      const similarIdeas = await searchSimilarIdeas(embedding, 5);
      const [trendData, sentimentData, marketData] = await Promise.all([
        getTrendData(idea, category),
        getSentimentData(idea, category),
        getMarketData(idea, market),
      ]);
      const scores = calculateScore({
        mentions_growth: trendData.mentions_growth,
        search_volume: trendData.search_volume,
        sentiment: sentimentData.score,
        competition: marketData.competition_index,
      });
      const aiAnalysis = await analyzeWithAI({
        idea, category, market, cost: cost ?? 0,
        similarIdeas, trendData, sentimentData, marketData, scores,
      });
      const result: ValidationResult = {
        idea, category, market, cost: cost ?? 0,
        scores, trendData, sentimentData, marketData, similarIdeas,
        demand_score: aiAnalysis.demand_score,
        estimated_price: aiAnalysis.estimated_price,
        profit_margin: aiAnalysis.profit_margin,
        sentiment_summary: aiAnalysis.sentiment_summary,
        suggestions: aiAnalysis.suggestions,
        verdict: aiAnalysis.verdict,
        created_at: new Date().toISOString(),
      };
      storeValidation(result, embedding).catch(console.error);
      return NextResponse.json({ type: 'validation', result });
    }

    // ── Chat path ─────────────────────────────────────────────
    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        type: 'message',
        content: "I'm running in demo mode — please add your GEMINI_API_KEY to enable full AI responses.",
      });
    }

    // Build context string from current validation
    let validationContext = '';
    if (currentValidation) {
      validationContext = `
CURRENT PRODUCT ANALYSIS CONTEXT:
- Idea: ${currentValidation.idea}
- Category: ${currentValidation.category}
- Market: ${currentValidation.market}
- Verdict: ${currentValidation.verdict} (Score: ${currentValidation.scores.opportunity_score}/100)
- Trend Stage: ${currentValidation.scores.trend_stage}
- Competition: ${currentValidation.scores.competition_level}
- Demand Score: ${currentValidation.demand_score}/100
- Estimated Price: $${currentValidation.estimated_price}
- Profit Margin: ${currentValidation.profit_margin}%
- Sentiment: ${currentValidation.sentimentData.label} (${Math.round(currentValidation.sentimentData.score * 100)}%)
- AI Suggestions: ${currentValidation.suggestions.join('; ')}
`;
    }

    const systemPrompt = `You are ProductIQ, an expert AI product strategist and market analyst. You help founders, entrepreneurs, and product teams validate ideas, analyze markets, and refine their product strategy through conversation.

${validationContext}

Your personality:
- Sharp, direct, and data-informed. No fluff.
- You think like a seasoned VC + product manager hybrid.
- You challenge assumptions but constructively.
- You give specific, actionable advice — not generic platitudes.
- You can pivot the analysis when the user proposes a different angle.
- When a user suggests a new idea or pivot, offer to run a fresh validation analysis.
- Keep responses concise but meaty. Use bullet points sparingly — prefer sharp prose.
- If asked about specific numbers, refer to the current analysis context above.

If the user wants to validate a NEW idea or pivot significantly, tell them you can run a fresh analysis and ask them to confirm or clarify the idea, category, target market, and estimated unit cost.`;

    // Format conversation history for Gemini
    // Gemini requires: first turn must be 'user', roles must alternate
    const allContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    // Drop leading model turns (the greeting) — must start with user
    const firstUserIdx = allContents.findIndex(m => m.role === 'user');
    const contents = firstUserIdx >= 0 ? allContents.slice(firstUserIdx) : allContents;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[api/chat] Gemini HTTP error:', response.status, errText);
      throw new Error(`Gemini ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response. Please try again.";

    // Check if AI is suggesting a re-validation
    const suggestsRevalidation = /run (a |the |fresh |new )?(analysis|validation)|validate (this|that|the new|the pivot)/i.test(text);

    return NextResponse.json({
      type: 'message',
      content: text,
      suggestsRevalidation,
    });

  } catch (error) {
    console.error('[api/chat] Error:', error);
    // Return 200 with error content so frontend displays it gracefully
    return NextResponse.json({
      type: 'message',
      content: `⚠️ ${String(error).replace('Error: ', '')}`,
    });
  }
}