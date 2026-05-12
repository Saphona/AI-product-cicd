# ProductIQ — AI Product Intelligence Platform

> Stop guessing. Validate product ideas in seconds using AI analysis, trend signals, and a data-backed scoring engine.

---

## 🎯 What This Is

ProductIQ is a full-stack SaaS MVP that takes a product idea and outputs:

- **Opportunity Score** (0–100) — composite market signal
- **Trend Stage** — EARLY / RISING / SATURATED
- **Competition Level** — LOW / MEDIUM / HIGH
- **AI Verdict** — STRONG_BUY / BUY / HOLD / AVOID
- **Improvement Suggestions** — ranked, specific, actionable
- **Financial Estimates** — retail price, gross margin
- **12-Month Trend Chart** — simulated time-series
- **Signal Radar** — multi-dimensional visual breakdown
- **Similar Validated Ideas** — semantic RAG retrieval

---

## 🏗 Architecture

```
User Input
    │
    ▼
POST /api/validate
    │
    ├─► generateEmbedding()     → Gemini text-embedding-004
    │
    ├─► searchSimilarIdeas()    → Supabase pgvector (cosine similarity)
    │
    ├─► getTrendData()          → trendService.ts (simulated + keyword signals)
    ├─► getSentimentData()      → sentimentService.ts (category priors + NLP)
    ├─► getMarketData()         → marketService.ts (market registry + region)
    │
    ├─► calculateScore()        → lib/scoring.ts (core algorithm)
    │       trend_score = (mentions_growth × 0.3) + (search_volume × 0.3)
    │                   + (sentiment × 0.2) − (competition × 0.2)
    │
    ├─► analyzeWithAI()         → Gemini 1.5 Flash (RAG-enhanced prompt)
    │
    ├─► storeValidation()       → Supabase (async, non-blocking)
    │
    └─► Return ValidationResult → ResultsPanel component
```

---

## 📁 Directory Structure

```
ai-product-intelligence/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout + metadata
│   ├── globals.css                 # Tailwind + custom styles
│   ├── dashboard/
│   │   └── page.tsx                # Main validation dashboard
│   └── api/
│       └── validate/
│           └── route.ts            # POST /api/validate
│
├── components/
│   ├── ValidationForm.tsx          # Input form component
│   └── ResultsPanel.tsx            # Results UI with charts
│
├── lib/
│   ├── types.ts                    # All TypeScript interfaces
│   ├── scoring.ts                  # 🔥 Core scoring algorithm (USP)
│   ├── embeddings.ts               # Gemini embedding + cosine similarity
│   ├── aiAnalysis.ts               # Gemini RAG-enhanced analysis
│   └── supabase.ts                 # DB client + vector search
│
├── services/
│   ├── trendService.ts             # Trend detection + time-series
│   ├── sentimentService.ts         # Sentiment analysis service
│   └── marketService.ts            # Market intelligence service
│
├── supabase/
│   └── schema.sql                  # Full PostgreSQL + pgvector schema
│
├── .env.example                    # Environment variable template
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd ai-product-intelligence
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in GEMINI_API_KEY and Supabase credentials
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run the entire contents of `supabase/schema.sql`
4. Copy your **Project URL** and **anon key** into `.env.local`

> **Note:** The app works without Supabase (falls back to mock similar ideas). You only need Supabase for the RAG vector search and result persistence.

### 4. Get a Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add it to `.env.local` as `GEMINI_API_KEY`

> **Note:** The app works without Gemini (uses intelligent mock analysis). Production use requires the key for real AI analysis and embeddings.

### 5. Run the development server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🧮 Core Scoring Algorithm

Located in `lib/scoring.ts`:

```typescript
// Trend Score (0–100)
trend_score =
  (mentions_growth × 0.30) +   // Momentum signal
  (search_volume   × 0.30) +   // Intent signal
  (sentiment       × 0.20) -   // Reception signal
  (competition     × 0.20)     // Market crowding penalty

// Opportunity Score (composite)
opportunity_score =
  trend_score × 0.60 +
  search_volume × 0.25 +
  (1 - competition) × 0.15

// Confidence Score
confidence = positiveAlignment × 0.40 + trendStrength × 0.40 - contradiction × 0.20
```

**Classification thresholds:**

| Metric | EARLY/LOW | RISING/MEDIUM | SATURATED/HIGH |
|--------|-----------|---------------|----------------|
| Trend Stage | 0–40% | 40–70% | 70–100% |
| Competition | 0–35% | 35–65% | 65–100% |

---

## 🗄 Supabase Schema

### `validations` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `idea` | TEXT | Product idea text |
| `category` | TEXT | Product category |
| `market` | TEXT | Target market/region |
| `cost` | NUMERIC | COGS per unit |
| `demand_score` | NUMERIC | 0–100 |
| `opportunity_score` | NUMERIC | 0–100 |
| `trend_score` | NUMERIC | 0–100 |
| `confidence` | NUMERIC | 0.000–1.000 |
| `trend_stage` | TEXT | EARLY/RISING/SATURATED |
| `competition_level` | TEXT | LOW/MEDIUM/HIGH |
| `verdict` | TEXT | STRFONG_BUY/BUY/HOLD/AVOID |
| `suggestions` | TEXT[] | Array of AI suggestions |
| `embedding` | VECTOR(768) | Gemini text-embedding-004 |
| `created_at` | TIMESTAMPTZ | Auto-set |

### `match_ideas` RPC function

Performs cosine similarity search using pgvector:

```sql
SELECT * FROM match_ideas(
  query_embedding := '[...768 floats...]',
  match_count := 5,
  min_similarity := 0.5
);
```

---

## 🚀 Deployment (Vercel)

```bash
npm install -g vercel
vercel

# Set environment variables in Vercel dashboard:
# GEMINI_API_KEY
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Or use the Vercel dashboard → **Import Git Repository** → add env vars.

---

## 🔮 Phase 2 Extensibility

The service layer is designed for future data source swaps:

### Real Trend Data
```typescript
// services/trendService.ts — uncomment and implement:
export async function fetchRealTrendData(idea: string, category: string) {
  const [google, reddit, twitter] = await Promise.all([
    fetchGoogleTrends(idea),
    fetchRedditMentions(idea),
    fetchTwitterVolume(idea),
  ]);
  // normalize and return TrendData
}
```

### Real Sentiment Analysis
```typescript
// services/sentimentService.ts — swap mock with:
export async function analyzeSentimentFromText(texts: string[]) {
  // Call your NLP API or fine-tuned model
}
```

### Supplier Integration
```typescript
// services/supplierService.ts (new file):
export async function findSuppliers(category: string, market: string) {
  // Alibaba API, Faire, etc.
}
```

### Social Validation Feed
```typescript
// services/socialService.ts (new file):
export async function fetchSocialMentions(idea: string) {
  // Reddit, Twitter/X, TikTok API
}
```

---

## 🧪 Testing Without API Keys

The app runs in **full mock mode** when API keys are not set:

- **No Gemini key** → Uses seeded deterministic embeddings + intelligent mock AI analysis
- **No Supabase** → Returns pre-seeded similar ideas array
- **Both missing** → Fully functional demo with realistic mock data

This means you can develop and demo the full flow locally with zero credentials.

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Database | Supabase (PostgreSQL + pgvector) |
| AI Model | Gemini 1.5 Flash |
| Embeddings | Gemini text-embedding-004 (768-dim) |
| Deployment | Vercel |

---

## 📝 License

MIT — build whatever you want with this.
