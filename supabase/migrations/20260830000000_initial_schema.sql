-- ═══════════════════════════════════════════════════════════════
-- ProductIQ — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enable pgvector extension ─────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. Validations table ─────────────────────────────────────
-- Stores all product validation results with their vector embeddings.

CREATE TABLE IF NOT EXISTS validations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Input fields
  idea              TEXT NOT NULL,
  category          TEXT NOT NULL,
  market            TEXT NOT NULL,
  cost              NUMERIC(12, 2) DEFAULT 0,

  -- Scores
  demand_score      NUMERIC(5, 2),
  opportunity_score NUMERIC(5, 2),
  trend_score       NUMERIC(5, 2),
  confidence        NUMERIC(4, 3),        -- 0.000–1.000

  -- Classifications
  trend_stage       TEXT CHECK (trend_stage IN ('EARLY', 'RISING', 'SATURATED')),
  competition_level TEXT CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH')),
  verdict           TEXT CHECK (verdict IN ('STRONG_BUY', 'BUY', 'HOLD', 'AVOID')),

  -- AI outputs
  suggestions       TEXT[],               -- Array of improvement suggestions
  sentiment_summary TEXT,
  estimated_price   NUMERIC(12, 2),
  profit_margin     NUMERIC(5, 2),

  -- Vector embedding (768 dims for Gemini text-embedding-004)
  embedding         VECTOR(768),

  -- Metadata
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Indexes ────────────────────────────────────────────────

-- HNSW index for fast approximate nearest-neighbor vector search
-- Use ivfflat for larger datasets (>100k rows)
CREATE INDEX IF NOT EXISTS validations_embedding_hnsw
  ON validations
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Standard indexes for filtering
CREATE INDEX IF NOT EXISTS idx_validations_category    ON validations (category);
CREATE INDEX IF NOT EXISTS idx_validations_market      ON validations (market);
CREATE INDEX IF NOT EXISTS idx_validations_verdict     ON validations (verdict);
CREATE INDEX IF NOT EXISTS idx_validations_created_at  ON validations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validations_trend_stage ON validations (trend_stage);

-- ── 4. RPC: match_ideas (Vector Similarity Search) ───────────
-- Called by /lib/supabase.ts → searchSimilarIdeas()
-- Returns top-k most similar validated ideas using cosine similarity.

CREATE OR REPLACE FUNCTION match_ideas(
  query_embedding VECTOR(768),
  match_count     INT DEFAULT 5,
  min_similarity  FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id           UUID,
  idea         TEXT,
  category     TEXT,
  similarity   FLOAT,
  demand_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.idea,
    v.category,
    1 - (v.embedding <=> query_embedding) AS similarity,
    v.demand_score
  FROM validations v
  WHERE v.embedding IS NOT NULL
    AND 1 - (v.embedding <=> query_embedding) >= min_similarity
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── 5. Auto-update updated_at trigger ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validations_updated_at ON validations;

CREATE TRIGGER validations_updated_at
  BEFORE UPDATE ON validations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
 
-- ── 6. Row Level Security (RLS) ───────────────────────────────
-- Enable for production. In MVP, allow public reads for demo data.

ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "Public read validations" ON validations;
DROP POLICY IF EXISTS "Public insert validations" ON validations;

-- Public read: anyone can view past validations (for RAG context)
CREATE POLICY "Public read validations"
  ON validations FOR SELECT
  USING (true);

-- Public insert: anyone can create a validation
CREATE POLICY "Public insert validations"
  ON validations FOR INSERT
  WITH CHECK (true);

-- ── 7. Seed data (optional demo rows for RAG context) ─────────
-- These are example validated ideas used as RAG context when the
-- database is empty. They provide semantic search targets immediately.
-- Embeddings are NULL initially — they'll be populated on first run
-- or you can run the seed script (scripts/seed-embeddings.ts).

INSERT INTO validations (idea, category, market, cost, demand_score, opportunity_score, trend_score, confidence, trend_stage, competition_level, verdict, suggestions, sentiment_summary, estimated_price, profit_margin)
VALUES
  (
    'AI-powered personal finance assistant that tracks spending and gives personalized saving tips',
    'FinTech', 'United States', 15, 78, 74, 80, 0.82,
    'RISING', 'MEDIUM', 'BUY',
    ARRAY['Focus on a niche (e.g., freelancers) before expanding', 'Differentiate on privacy — no data selling', 'Partner with credit unions for distribution', 'Build habit-forming daily check-in feature'],
    'Strong consumer interest in personal finance tools. Users respond well to actionable, non-judgmental guidance.',
    49, 68
  ),
  (
    'Sustainable meal kit delivery service using locally sourced ingredients and zero-waste packaging',
    'Food & Beverage', 'Europe', 22, 71, 65, 72, 0.76,
    'RISING', 'HIGH', 'HOLD',
    ARRAY['Target premium eco-conscious segment willing to pay 30%+ premium', 'Build supplier relationships to reduce COGS', 'Use composable packaging as key differentiator in marketing', 'Start in one city before expanding'],
    'Growing demand for sustainable food options. However, high competition from established players keeps margins tight.',
    65, 45
  ),
  (
    'B2B SaaS platform for remote team productivity analytics and async collaboration insights',
    'B2B SaaS', 'Global', 8, 83, 79, 85, 0.88,
    'RISING', 'MEDIUM', 'BUY',
    ARRAY['Focus on mid-market companies (50-500 employees) as beachhead', 'Integrate with Slack and Notion on day one', 'Freemium model with 14-day trial for full features', 'Build transparent data practices into core product — privacy sells'],
    'Positive sentiment driven by remote work normalization. IT buyers are actively evaluating productivity tools.',
    79, 72
  ),
  (
    'Wearable device that monitors hydration levels throughout the day using biosensors',
    'Wearables', 'United States', 35, 68, 71, 75, 0.79,
    'EARLY', 'LOW', 'BUY',
    ARRAY['Validate core sensor accuracy claims with clinical study before launch', 'Partner with fitness influencers for launch credibility', 'Bundle with hydration tracking app for recurring revenue', 'Target athletic and outdoor recreation segment first'],
    'Early but growing interest in preventive health wearables. Consumers are receptive to quantified-self devices.',
    129, 55
  ),
  (
    'EdTech platform teaching programming to kids through AI-generated personalized game design projects',
    'EdTech', 'Global', 5, 85, 82, 88, 0.91,
    'RISING', 'MEDIUM', 'STRONG_BUY',
    ARRAY['Launch with a 4-week cohort model to build community and validate curriculum', 'Target parents of 8-14 year olds via Pinterest and parent Facebook groups', 'Build demo game in 48 hours and use it as your entire marketing', 'Consider B2B school licensing after proving B2C'],
    'Extremely strong reception for kid-focused coding education. Parents actively seek future-proof skill development.',
    29, 80
  )
ON CONFLICT DO NOTHING;

-- ── 8. Helpful views ─────────────────────────────────────────

-- Top opportunities view
CREATE OR REPLACE VIEW top_opportunities AS
SELECT id, idea, category, market, opportunity_score, verdict, trend_stage, created_at
FROM validations
WHERE verdict IN ('STRONG_BUY', 'BUY')
ORDER BY opportunity_score DESC
LIMIT 50;

-- Category performance summary
CREATE OR REPLACE VIEW category_stats AS
SELECT
  category,
  COUNT(*) AS total_validations,
  ROUND(AVG(opportunity_score)::numeric, 1) AS avg_opportunity_score,
  ROUND(AVG(demand_score)::numeric, 1) AS avg_demand_score,
  MODE() WITHIN GROUP (ORDER BY verdict) AS most_common_verdict
FROM validations
GROUP BY category
ORDER BY avg_opportunity_score DESC;


