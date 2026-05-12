'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap, ArrowLeft, Send, RotateCcw, ChevronDown,
  ChevronUp, TrendingUp, DollarSign,
  Heart, Lightbulb, CheckCircle2, AlertTriangle, XCircle,
  ArrowUpRight, Users, BarChart2, Loader2, Sparkles,
  MessageSquare, Settings2, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import type { ValidationResult, Verdict } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  validation?: ValidationResult;
  isValidating?: boolean;
}

interface PendingValidation {
  idea: string;
  category: string;
  market: string;
  cost: number;
}

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  'AI & Machine Learning', 'Health & Wellness', 'Wearables', 'EdTech',
  'FinTech', 'Food & Beverage', 'Gaming', 'B2B SaaS', 'E-commerce',
  'Productivity', 'Sustainability', 'Home & Living', 'Travel', 'Fashion', 'Other',
];
const MARKETS = [
  'United States', 'Europe', 'Asia-Pacific', 'India', 'Global',
  'Latin America', 'Middle East', 'Africa', 'Southeast Asia',
];

const VERDICT_CONFIG: Record<Verdict, {
  label: string; color: string; bg: string; border: string;
  icon: React.ElementType; description: string;
}> = {
  STRONG_BUY: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2, description: 'Excellent opportunity. Move fast.' },
  BUY: { label: 'Buy', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: ArrowUpRight, description: 'Good opportunity with manageable risks.' },
  HOLD: { label: 'Hold', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, description: 'Mixed signals. Validate further before committing.' },
  AVOID: { label: 'Avoid', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle, description: 'Unfavorable conditions. Significant pivot needed.' },
};

const QUICK_STARTERS = [
  "What's the biggest risk with this idea?",
  "How should I position against competitors?",
  "What's the best go-to-market strategy?",
  "Should I pivot to a B2B model instead?",
  "What features should I build first?",
];

// ── ScoreRing ──────────────────────────────────────────────────
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-white">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/40 text-center">{label}</span>
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }) {
  const s = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s[variant]}`}>{label}</span>;
}

// ── ValidationCard ─────────────────────────────────────────────
function ValidationCard({ result }: { result: ValidationResult }) {
  const [expanded, setExpanded] = useState(false);
  const v = VERDICT_CONFIG[result.verdict];
  const VIcon = v.icon;
  const radarData = [
    { subject: 'Trend', value: result.scores.trend_score },
    { subject: 'Demand', value: result.demand_score },
    { subject: 'Sentiment', value: Math.round(result.sentimentData.score * 100) },
    { subject: 'Market', value: Math.min(100, Math.round(result.marketData.growth_rate_pct * 3)) },
    { subject: 'Opportunity', value: result.scores.opportunity_score },
  ];
  return (
    <div className={`rounded-2xl border ${v.border} ${v.bg} overflow-hidden w-full`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${v.bg} border ${v.border}`}>
              <VIcon size={15} className={v.color} />
            </div>
            <div>
              <p className={`text-base font-black ${v.color}`}>{v.label}</p>
              <p className="text-[10px] text-white/40">{v.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-white">{result.scores.opportunity_score}</p>
            <p className="text-[10px] text-white/30">/ 100</p>
          </div>
        </div>
        <div className="flex justify-around mt-3 pt-3 border-t border-white/5">
          <ScoreRing value={result.scores.trend_score} label="Trend" color="#a78bfa" />
          <ScoreRing value={result.demand_score} label="Demand" color="#22d3ee" />
          <ScoreRing value={result.sentimentData.score * 100} label="Sentiment" color="#34d399" />
          <ScoreRing value={result.scores.opportunity_score} label="Opportunity" color="#f59e0b" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg border border-white/8 bg-black/20 p-2 text-center">
            <p className="text-[10px] text-white/30 mb-0.5">Trend</p>
            <Badge label={result.scores.trend_stage} variant={result.scores.trend_stage === 'EARLY' ? 'info' : result.scores.trend_stage === 'RISING' ? 'success' : 'warning'} />
          </div>
          <div className="rounded-lg border border-white/8 bg-black/20 p-2 text-center">
            <p className="text-[10px] text-white/30 mb-0.5">Competition</p>
            <Badge label={result.scores.competition_level} variant={result.scores.competition_level === 'LOW' ? 'success' : result.scores.competition_level === 'MEDIUM' ? 'warning' : 'danger'} />
          </div>
          <div className="rounded-lg border border-white/8 bg-black/20 p-2 text-center">
            <p className="text-[10px] text-white/30 mb-0.5">Price Est.</p>
            <p className="text-xs font-bold text-white">${result.estimated_price.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-white/30 hover:text-white/60 transition-colors border-t border-white/5 bg-black/10">
        {expanded ? <><ChevronUp size={12} /> Hide details</> : <><ChevronDown size={12} /> Full analysis</>}
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4 bg-black/10">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] text-white/30 flex items-center gap-1 mb-1"><DollarSign size={10} /> Retail Price</p>
              <p className="text-xl font-black text-white">${result.estimated_price.toLocaleString()}</p>
              <p className="text-[10px] text-white/20">COGS: ${result.cost}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] text-white/30 flex items-center gap-1 mb-1"><BarChart2 size={10} /> Gross Margin</p>
              <p className="text-xl font-black text-white">{result.profit_margin}%</p>
              <p className="text-[10px] text-white/20">Mkt: ${(result.marketData.market_size_usd / 1e9).toFixed(0)}B</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-2 font-medium">12-Month Trend</p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={result.trendData.time_series} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 10 }} labelStyle={{ color: 'rgba(255,255,255,0.4)' }} itemStyle={{ color: '#a78bfa' }} />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#trendG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-1 font-medium">Signal Radar</p>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
                <Radar name="Score" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.12} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="text-[10px] text-white/40 flex items-center gap-1 mb-2"><Heart size={10} className="text-pink-400" /> Customer Sentiment</p>
            <p className="text-xs text-white/60 leading-relaxed">{result.sentiment_summary}</p>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="text-[10px] text-violet-400 flex items-center gap-1 mb-2"><Lightbulb size={10} /> AI Suggestions</p>
            <div className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-violet-400 font-bold text-[10px] flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-[11px] text-white/60 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
          {result.similarIdeas?.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] text-white/40 flex items-center gap-1 mb-2"><Target size={10} className="text-violet-400" /> Similar Ideas</p>
              {result.similarIdeas.map((idea, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-[11px] text-white/80">{idea.idea}</p>
                    <p className="text-[10px] text-white/30">{idea.category}</p>
                  </div>
                  <span className="text-[11px] font-bold text-cyan-400 ml-3">{Math.round(idea.similarity * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
        <Zap size={12} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/8 px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pivot Modal ────────────────────────────────────────────────
function PivotModal({ pending, onConfirm, onClose, loading }: {
  pending: PendingValidation; onConfirm: (d: PendingValidation) => void;
  onClose: () => void; loading: boolean;
}) {
  const [form, setForm] = useState(pending);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d1a] p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Validate New Idea</h2>
            <p className="text-[11px] text-white/30">Confirm details before running analysis</p>
          </div>
        </div>
        <div className="space-y-3">
          <textarea value={form.idea} onChange={e => setForm(f => ({ ...f, idea: e.target.value }))} rows={3}
            placeholder="Describe your idea..."
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none">
              <option value="" className="bg-[#0d0d1a]">Category</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0d1a]">{c}</option>)}
            </select>
            <select value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
              className="bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none">
              <option value="" className="bg-[#0d0d1a]">Market</option>
              {MARKETS.map(m => <option key={m} value={m} className="bg-[#0d0d1a]">{m}</option>)}
            </select>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
              placeholder="Unit cost"
              className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-all">Cancel</button>
          <button onClick={() => onConfirm(form)} disabled={loading || !form.idea || !form.category || !form.market}
            className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-40 hover:bg-white/90 transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Zap size={14} /> Run Analysis</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: "Hey! I'm **ProductIQ** — your AI product strategist. Describe a product idea to run a full analysis, or just start chatting. I can help with market trends, competitive positioning, pricing strategy, and whether an idea is worth pursuing.",
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  const [pendingValidation, setPendingValidation] = useState<PendingValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState({ idea: '', category: '', market: '', cost: '' });
  const [formVisible, setFormVisible] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const m: ChatMessage = { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date() };
    setMessages(prev => [...prev, m]);
    return m;
  }, []);

  const runValidation = useCallback(async (data: PendingValidation) => {
    setIsValidating(true);
    setPendingValidation(null);
    const loadingMsg = addMessage({
      role: 'assistant', isValidating: true,
      content: `Running full analysis on **"${data.idea.slice(0, 70)}${data.idea.length > 70 ? '...' : ''}"**...`,
    });
    try {
      const res = await fetch('/api/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result: ValidationResult = await res.json();
      setCurrentValidation(result);
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, content: `Analysis complete for **"${data.idea.slice(0, 55)}${data.idea.length > 55 ? '...' : ''}"**:`, validation: result, isValidating: false }
        : m
      ));
      setTimeout(() => addMessage({
        role: 'assistant',
        content: `Verdict: **${result.verdict.replace('_', ' ')}** · Score: **${result.scores.opportunity_score}/100** · Trend: **${result.scores.trend_stage}** · Competition: **${result.scores.competition_level}**\n\n${result.suggestions[0]} What would you like to explore?`,
      }), 400);
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, content: 'Analysis failed. Please try again.', isValidating: false } : m));
    } finally {
      setIsValidating(false);
    }
  }, [addMessage]);

  const handleInitialValidate = async () => {
    if (!formData.idea || !formData.category || !formData.market) return;
    setFormVisible(false);
    addMessage({ role: 'user', content: `Validate: **${formData.idea}**\n${formData.category} · ${formData.market} · $${formData.cost || 0} unit cost` });
    await runValidation({ idea: formData.idea, category: formData.category, market: formData.market, cost: parseFloat(formData.cost) || 0 });
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;
    setInput('');
    addMessage({ role: 'user', content });
    setIsTyping(true);
    try {
      const history = messages
        .filter(m => !m.isValidating)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content }], currentValidation }),
      });
      const data = await res.json();
      setIsTyping(false);
      addMessage({ role: 'assistant', content: data.content ?? 'Something went wrong.' });
      if (data.suggestsRevalidation && currentValidation) {
        setTimeout(() => setPendingValidation({
          idea: content, category: currentValidation.category,
          market: currentValidation.market, cost: currentValidation.cost,
        }), 700);
      }
    } catch {
      setIsTyping(false);
      addMessage({ role: 'assistant', content: 'Sorry, hit an error. Please try again.' });
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderContent = (content: string) =>
    content.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{p}</strong> : p)}</p>;
    });

  const resetSession = () => {
    setMessages([{ id: '0', role: 'assistant', timestamp: new Date(), content: "New session! Tell me about a product idea you want to explore." }]);
    setCurrentValidation(null);
    setFormVisible(true);
    setFormData({ idea: '', category: '', market: '', cost: '' });
  };

  return (
    <div className="flex h-screen bg-[#080810] text-white overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="w-60 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#06060f]">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/" className="text-white/30 hover:text-white transition-colors">
              <ArrowLeft size={15} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                <Zap size={11} className="text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">ProductIQ</span>
            </div>
          </div>
          <button onClick={resetSession}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-white/8 text-xs text-white/40 hover:text-white hover:border-white/20 transition-all">
            <RotateCcw size={11} /> New Session
          </button>
        </div>

        {currentValidation && (
          <div className="p-3 border-b border-white/5">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Active Analysis</p>
            <div className={`rounded-xl border ${VERDICT_CONFIG[currentValidation.verdict].border} ${VERDICT_CONFIG[currentValidation.verdict].bg} p-3 mb-2`}>
              <p className="text-[11px] text-white/70 truncate mb-1.5">{currentValidation.idea.slice(0, 42)}...</p>
              <div className="flex items-center justify-between">
                <Badge label={currentValidation.verdict.replace('_', ' ')}
                  variant={currentValidation.verdict === 'STRONG_BUY' ? 'success' : currentValidation.verdict === 'BUY' ? 'info' : currentValidation.verdict === 'HOLD' ? 'warning' : 'danger'} />
                <span className="text-sm font-black text-white">{currentValidation.scores.opportunity_score}</span>
              </div>
            </div>
            <button onClick={() => setPendingValidation({ idea: '', category: currentValidation.category, market: currentValidation.market, cost: currentValidation.cost })}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-violet-500/20 text-[11px] text-violet-400 hover:bg-violet-500/10 transition-all">
              <Sparkles size={10} /> Validate New Idea
            </button>
          </div>
        )}

        {currentValidation && (
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Ask me...</p>
            {QUICK_STARTERS.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="w-full text-left text-[11px] text-white/35 hover:text-white/75 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-all leading-relaxed mb-1">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-white/5 mt-auto">
          <Link href="/history" className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/60 transition-colors py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
            <MessageSquare size={11} /> History
          </Link>
        </div>
      </div>

      {/* ── Chat Area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-11 border-b border-white/5 flex items-center px-5 justify-between flex-shrink-0 bg-[#06060f]/50">
          <span className="text-sm font-medium text-white/50 truncate max-w-md">
            {currentValidation ? currentValidation.idea.slice(0, 55) + (currentValidation.idea.length > 55 ? '...' : '') : 'Product Intelligence Chat'}
          </span>
          {currentValidation && (
            <div className="flex items-center gap-4 text-[11px] text-white/25 flex-shrink-0">
              <span className="flex items-center gap-1"><TrendingUp size={10} />{currentValidation.scores.trend_stage}</span>
              <span className="flex items-center gap-1"><Users size={10} />{currentValidation.scores.competition_level}</span>
              <span className="flex items-center gap-1"><Target size={10} />{currentValidation.market}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="max-w-2xl mx-auto">

            {/* Inline validation form */}
            {formVisible && !currentValidation && (
              <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 size={13} className="text-violet-400" />
                  <p className="text-sm font-semibold">Start with a product idea</p>
                </div>
                <div className="space-y-3">
                  <textarea value={formData.idea} onChange={e => setFormData(f => ({ ...f, idea: e.target.value }))}
                    placeholder="Describe your product idea in detail..." rows={2}
                    className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
                  <div className="grid grid-cols-3 gap-2">
                    <select value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                      className="bg-white/[0.04] border border-white/8 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none">
                      <option value="" className="bg-[#0d0d1a]">Category</option>
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0d1a]">{c}</option>)}
                    </select>
                    <select value={formData.market} onChange={e => setFormData(f => ({ ...f, market: e.target.value }))}
                      className="bg-white/[0.04] border border-white/8 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none">
                      <option value="" className="bg-[#0d0d1a]">Market</option>
                      {MARKETS.map(m => <option key={m} value={m} className="bg-[#0d0d1a]">{m}</option>)}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                      <input type="number" value={formData.cost} onChange={e => setFormData(f => ({ ...f, cost: e.target.value }))}
                        placeholder="Cost" className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-5 pr-2.5 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleInitialValidate} disabled={!formData.idea || !formData.category || !formData.market || isValidating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-40 hover:bg-white/90 transition-all">
                    {isValidating ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Zap size={14} /> Run Analysis</>}
                  </button>
                </div>
              </div>
            )}

            {/* Message list */}
            <div className="space-y-1">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 mb-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' ? (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap size={12} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-white/50">U</span>
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[88%] ${msg.role === 'user'
                      ? 'bg-violet-600/25 border border-violet-500/25 text-white/85 rounded-br-sm'
                      : 'bg-white/[0.04] border border-white/8 text-white/70 rounded-bl-sm'
                      } ${msg.isValidating ? 'animate-pulse' : ''}`}>
                      {msg.isValidating && <Loader2 size={12} className="inline mr-2 animate-spin text-violet-400" />}
                      {renderContent(msg.content)}
                    </div>
                    {msg.validation && (
                      <div className="mt-3 w-full max-w-lg">
                        <ValidationCard result={msg.validation} />
                      </div>
                    )}
                    <p className="text-[10px] text-white/15 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && <TypingIndicator />}
            </div>
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {['What markets are trending?', 'How do I validate an idea?', 'What makes a good SaaS product?'].map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/8 text-white/35 hover:text-white/70 hover:border-white/20 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={currentValidation ? 'Ask anything, or describe a pivot...' : 'Ask me about product strategy, markets, or pricing...'}
                rows={1}
                className="flex-1 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
                style={{ minHeight: '44px', maxHeight: '120px' }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 disabled:opacity-25 hover:bg-white/90 transition-all">
                {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-white/15 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      {pendingValidation && (
        <PivotModal pending={pendingValidation} onConfirm={runValidation} onClose={() => setPendingValidation(null)} loading={isValidating} />
      )}
    </div>
  );
}