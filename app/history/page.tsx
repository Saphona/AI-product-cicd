
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, TrendingUp, Clock, RefreshCw } from 'lucide-react';

interface HistoryItem {
  id: string;
  idea: string;
  category: string;
  market: string;
  cost: number;
  opportunity_score: number;
  trend_score: number;
  verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID';
  trend_stage: 'EARLY' | 'RISING' | 'SATURATED';
  competition_level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  created_at: string;
}

const VERDICT_STYLES = {
  STRONG_BUY: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  BUY:        { label: 'Buy',        color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  HOLD:       { label: 'Hold',       color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  AVOID:      { label: 'Avoid',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

const TREND_STYLES = {
  EARLY:     { label: 'Early',     color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  RISING:    { label: 'Rising',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  SATURATED: { label: 'Saturated', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function HistoryPage() {
  const [items, setItems]     = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/history?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHistory(); }, []);

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <nav className="border-b border-white/5 backdrop-blur-xl bg-[#080810]/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                <Zap size={14} />
              </div>
              <span className="font-semibold text-sm">ProductIQ</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <Link href="/dashboard" className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors">
              + New Validation
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter mb-2">Validation History</h1>
          <p className="text-white/40 text-sm">All past product validations, ordered by most recent.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <RefreshCw size={16} className="animate-spin" />
              Loading validations…
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center justify-center">
              <Clock size={22} className="text-white/10" />
            </div>
            <p className="text-white/20 text-sm">No validations yet.<br />Run your first one from the dashboard.</p>
            <Link href="/dashboard" className="mt-2 px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const verdict = VERDICT_STYLES[item.verdict];
              const trend   = TREND_STYLES[item.trend_stage];
              return (
                <div key={item.id} className="rounded-xl border border-white/6 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate mb-1">{item.idea}</p>
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.market}</span>
                        <span>·</span>
                        <Clock size={10} />
                        <span>{timeAgo(item.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${verdict.bg} ${verdict.border} ${verdict.color}`}>
                        {verdict.label}
                      </span>
                      <div className="text-right">
                        <div className="text-xl font-black text-white">{Math.round(item.opportunity_score)}</div>
                        <div className="text-xs text-white/20">score</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-white/30">
                      <TrendingUp size={11} />
                      <span>Trend {Math.round(item.trend_score)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${trend.bg} ${trend.border} ${trend.color}`}>
                      {trend.label}
                    </span>
                    <span className="text-xs text-white/20">
                      {Math.round(item.confidence * 100)}% confidence
                    </span>
                    {item.cost > 0 && (
                      <span className="text-xs text-white/20">
                        ${item.cost} COGS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
