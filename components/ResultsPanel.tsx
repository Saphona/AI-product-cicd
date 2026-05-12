'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, DollarSign,
  Heart, Lightbulb, CheckCircle2, AlertTriangle,
  XCircle, ArrowUpRight, Users, BarChart2,
} from 'lucide-react';
import type { ValidationResult, Verdict } from '@/lib/types';

interface Props {
  result: ValidationResult;
}

const VERDICT_CONFIG: Record<Verdict, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  description: string;
}> = {
  STRONG_BUY: {
    label: 'Strong Buy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
    description: 'Excellent opportunity. Move fast.',
  },
  BUY: {
    label: 'Buy',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: ArrowUpRight,
    description: 'Good opportunity with manageable risks.',
  },
  HOLD: {
    label: 'Hold',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
    description: 'Mixed signals. Validate further before committing.',
  },
  AVOID: {
    label: 'Avoid',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: XCircle,
    description: 'Unfavorable conditions. Significant pivot needed.',
  },
};

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-white">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-xs text-white/40">{label}</span>
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }) {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold ${styles[variant]}`}>
      {label}
    </span>
  );
}

export function ResultsPanel({ result }: Props) {
  const verdict = VERDICT_CONFIG[result.verdict];
  const VerdictIcon = verdict.icon;

  // Radar chart data
  const radarData = [
    { subject: 'Trend', value: result.scores.trend_score },
    { subject: 'Demand', value: result.demand_score },
    { subject: 'Sentiment', value: Math.round(result.sentimentData.score * 100) },
    { subject: 'Market Size', value: Math.min(100, Math.round(result.marketData.growth_rate_pct * 3)) },
    { subject: 'Opportunity', value: result.scores.opportunity_score },
  ];

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <div className={`rounded-2xl border ${verdict.border} ${verdict.bg} p-6 flex items-start justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${verdict.bg} border ${verdict.border}`}>
            <VerdictIcon size={22} className={verdict.color} />
          </div>
          <div>
            <p className="text-xs text-white/40 mb-0.5">AI Verdict</p>
            <p className={`text-2xl font-black ${verdict.color}`}>{verdict.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{verdict.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-white">{result.scores.opportunity_score}</p>
          <p className="text-xs text-white/30">Opportunity Score</p>
          <p className="text-xs text-white/20 mt-1">{Math.round(result.scores.confidence * 100)}% confidence</p>
        </div>
      </div>

      {/* Score Rings */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-6">Score Breakdown</h3>
        <div className="flex justify-around flex-wrap gap-6">
          <ScoreRing value={result.scores.trend_score} label="Trend Score" color="#a78bfa" />
          <ScoreRing value={result.demand_score} label="Demand Score" color="#22d3ee" />
          <ScoreRing value={result.sentimentData.score * 100} label="Sentiment" color="#34d399" />
          <ScoreRing value={result.scores.opportunity_score} label="Opportunity" color="#f59e0b" />
        </div>
      </div>

      {/* Classifications */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><TrendingUp size={12} /> Trend Stage</p>
          <Badge
            label={result.scores.trend_stage}
            variant={result.scores.trend_stage === 'EARLY' ? 'info' : result.scores.trend_stage === 'RISING' ? 'success' : 'warning'}
          />
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><Users size={12} /> Competition</p>
          <Badge
            label={result.scores.competition_level}
            variant={result.scores.competition_level === 'LOW' ? 'success' : result.scores.competition_level === 'MEDIUM' ? 'warning' : 'danger'}
          />
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><Heart size={12} /> Sentiment</p>
          <Badge
            label={result.sentimentData.label}
            variant={result.sentimentData.label === 'POSITIVE' ? 'success' : result.sentimentData.label === 'NEUTRAL' ? 'warning' : 'danger'}
          />
        </div>
      </div>

      {/* Financial estimates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-xs text-white/30 mb-1 flex items-center gap-1.5"><DollarSign size={12} /> Est. Retail Price</p>
          <p className="text-2xl font-black text-white">${result.estimated_price.toLocaleString()}</p>
          <p className="text-xs text-white/20 mt-0.5">Based on ${result.cost} COGS</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-xs text-white/30 mb-1 flex items-center gap-1.5"><BarChart2 size={12} /> Gross Margin</p>
          <p className="text-2xl font-black text-white">{result.profit_margin}%</p>
          <p className="text-xs text-white/20 mt-0.5">Est. market size: ${(result.marketData.market_size_usd / 1e9).toFixed(0)}B</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold">12-Month Trend</h3>
            <p className="text-xs text-white/30">{result.trendData.trend_stage === 'RISING' ? '↑ Upward momentum' : result.trendData.trend_stage === 'EARLY' ? '◦ Early signals' : '→ Saturating'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            {result.trendData.mentions_growth > 0.5 ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
            {Math.round(result.trendData.mentions_growth * 100)}% mentions growth
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={result.trendData.time_series} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'rgba(255,255,255,0.4)' }}
              itemStyle={{ color: '#a78bfa' }}
            />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#trendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold mb-4">Signal Radar</h3>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} />
            <Radar name="Score" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.12} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment Summary */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Heart size={14} className="text-pink-400" /> Customer Sentiment
        </h3>
        <p className="text-sm text-white/50 leading-relaxed">{result.sentiment_summary}</p>
      </div>

      {/* Similar Ideas */}
      {result.similarIdeas.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Target size={14} className="text-violet-400" /> Similar Validated Ideas
          </h3>
          <div className="space-y-3">
            {result.similarIdeas.map((idea, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white/80 font-medium">{idea.idea}</p>
                  <p className="text-xs text-white/30">{idea.category}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-bold text-cyan-400">{Math.round(idea.similarity * 100)}%</p>
                  <p className="text-xs text-white/20">similar</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Lightbulb size={14} className="text-violet-400" /> AI Improvement Suggestions
        </h3>
        <div className="space-y-3">
          {result.suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-violet-400 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
              <p className="text-sm text-white/60 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
