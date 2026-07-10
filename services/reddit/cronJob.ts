/**
 * cronJob.ts
 *
 * Scheduled Reddit scraping jobs.
 *
 * Schedule:
 *   Every 6h  — scrape HIGH/MEDIUM keywords across registered subreddits
 *   Every 24h — re-run subreddit discovery for active categories
 *   Every 7d  — purge signals older than 90 days
 *
 * Usage:
 *   Run as a standalone process: npx tsx services/reddit/cronJob.ts
 *   Or import startCronJobs() in your server entrypoint.
 *
 * Requires: npm install node-cron
 */

import cron from 'node-cron';
import { getSubredditsForCategory, CATEGORY_SUBREDDITS } from './discoveryService';
import { scrapeMultipleSubreddits } from './scraperService';
import { processAndStorePosts } from './processingService';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// All active categories to scrape
const ACTIVE_CATEGORIES = Object.keys(CATEGORY_SUBREDDITS).filter(k => k !== 'default');

// ── Job 1: Scrape HIGH/MEDIUM demand signals every 6 hours ────

async function runScrapeJob(): Promise<void> {
  console.log('[cron] Starting scrape job:', new Date().toISOString());

  for (const category of ACTIVE_CATEGORIES) {
    try {
      // Get subreddits for this category
      const subreddits = await getSubredditsForCategory(category, category);
      const topSubs    = subreddits.slice(0, 5); // limit per run to stay polite

      console.log(`[cron] Scraping ${topSubs.length} subreddits for: ${category}`);

      // Use broad keyword that matches multiple tiers
      const posts = await scrapeMultipleSubreddits(topSubs, category, false);
      console.log(`[cron] Found ${posts.length} demand-signal posts for: ${category}`);

      // Embed and store
      if (posts.length > 0) {
        await processAndStorePosts(posts);
        console.log(`[cron] Stored ${posts.length} signals for: ${category}`);
      }

      // Polite delay between categories
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`[cron] Failed for category ${category}:`, err);
    }
  }

  console.log('[cron] Scrape job complete:', new Date().toISOString());
}

// ── Job 2: Refresh subreddit discovery every 24 hours ─────────

async function runDiscoveryJob(): Promise<void> {
  console.log('[cron] Starting discovery refresh:', new Date().toISOString());

  for (const category of ACTIVE_CATEGORIES) {
    try {
      await getSubredditsForCategory(category, category);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[cron] Discovery failed for ${category}:`, err);
    }
  }

  console.log('[cron] Discovery refresh complete');
}

// ── Job 3: Purge old signals every 7 days ────────────────────

async function runPurgeJob(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  console.log('[cron] Starting purge job');

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reddit_signals?scraped_at=lt.${ninetyDaysAgo.toISOString()}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    console.log('[cron] Purge complete, status:', res.status);
  } catch (err) {
    console.error('[cron] Purge failed:', err);
  }
}

// ── Start all jobs ────────────────────────────────────────────

export function startCronJobs(): void {
  console.log('[cron] Starting ProductIQ Reddit scraper cron jobs');

  // Every 6 hours
  cron.schedule('0 */6 * * *', runScrapeJob);

  // Every 24 hours at 2am
  cron.schedule('0 2 * * *', runDiscoveryJob);

  // Every Sunday at 3am
  cron.schedule('0 3 * * 0', runPurgeJob);

  // Run scrape immediately on startup
  runScrapeJob().catch(console.error);

  console.log('[cron] Jobs scheduled: scrape(6h), discovery(24h), purge(7d)');
}

// ── Standalone runner ─────────────────────────────────────────
// Run with: npx tsx services/reddit/cronJob.ts

if (process.argv[1]?.includes('cronJob')) {
  startCronJobs();
}