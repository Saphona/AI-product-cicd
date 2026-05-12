'use client';

import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

const CATEGORIES = [
  'AI & Machine Learning',
  'Health & Wellness',
  'Wearables',
  'EdTech',
  'FinTech',
  'Food & Beverage',
  'Gaming',
  'B2B SaaS',
  'E-commerce',
  'Productivity',
  'Sustainability',
  'Home & Living',
  'Travel',
  'Fashion',
  'Other',
];

const MARKETS = [
  'United States',
  'Europe',
  'Asia-Pacific',
  'India',
  'Global',
  'Latin America',
  'Middle East',
  'Africa',
  'Southeast Asia',
];

interface Props {
  onSubmit: (data: { idea: string; category: string; market: string; cost: number }) => void;
  loading: boolean;
}

export function ValidationForm({ onSubmit, loading }: Props) {
  const [idea, setIdea] = useState('');
  const [category, setCategory] = useState('');
  const [market, setMarket] = useState('');
  const [cost, setCost] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || !category || !market) return;
    onSubmit({ idea: idea.trim(), category, market, cost: parseFloat(cost) || 0 });
  }

  const isValid = idea.trim().length > 10 && category && market;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <h2 className="font-bold mb-1 text-sm">Product Details</h2>
      <p className="text-white/30 text-xs mb-6">The more detail, the better the analysis.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Idea */}
        <div>
          <label className="block text-xs text-white/50 mb-2 font-medium">
            Product Idea <span className="text-violet-400">*</span>
          </label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="Describe your product idea in 1-3 sentences. E.g. 'An AI-powered sleep tracker ring that analyzes sleep stages and gives personalized improvement suggestions for remote workers.'"
            rows={4}
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
          />
          <p className="text-xs text-white/20 mt-1">{idea.length} chars — be specific for better results</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-white/50 mb-2 font-medium">
            Category <span className="text-violet-400">*</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-[#080810]">Select a category</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-[#080810]">{c}</option>
            ))}
          </select>
        </div>

        {/* Market */}
        <div>
          <label className="block text-xs text-white/50 mb-2 font-medium">
            Target Market <span className="text-violet-400">*</span>
          </label>
          <select
            value={market}
            onChange={e => setMarket(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
          >
            <option value="" className="bg-[#080810]">Select a market</option>
            {MARKETS.map(m => (
              <option key={m} value={m} className="bg-[#080810]">{m}</option>
            ))}
          </select>
        </div>

        {/* Cost */}
        <div>
          <label className="block text-xs text-white/50 mb-2 font-medium">
            Estimated COGS / Unit Cost (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-white/[0.04] border border-white/8 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <p className="text-xs text-white/20 mt-1">Used to estimate retail price and profit margin</p>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap size={16} />
              Validate Idea
            </>
          )}
        </button>
      </form>
    </div>
  );
}
