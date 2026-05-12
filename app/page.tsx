'use client';

import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp, Brain, BarChart3, Target, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#080810] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#080810]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold tracking-tight text-sm">ProductIQ</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <Link href="/dashboard" className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8">
            <Sparkles size={12} />
            AI-Powered Product Validation
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
            Validate ideas
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              before you build.
            </span>
          </h1>

          <p className="text-lg text-white/40 max-w-xl mx-auto mb-12 leading-relaxed">
            Stop guessing. Use AI, trend data, and market intelligence to score your product idea in seconds—not months.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all">
              Validate your idea
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/10 text-white/60 text-sm hover:border-white/20 hover:text-white transition-all">
              See how it works
            </a>
          </div>
        </div>

        {/* Mock score card */}
        <div className="relative max-w-3xl mx-auto mt-24">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-white/30 mb-1">Validating</p>
                <p className="font-semibold text-white">AI-powered sleep tracker for remote workers</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-cyan-400">82</div>
                <div className="text-xs text-white/30">Opportunity Score</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Trend Score', value: 88, color: 'from-violet-500 to-violet-400' },
                { label: 'Demand Score', value: 76, color: 'from-cyan-500 to-cyan-400' },
                { label: 'Sentiment', value: 91, color: 'from-emerald-500 to-emerald-400' },
                { label: 'Competition', value: 'LOW', color: 'from-amber-500 to-amber-400', text: true },
              ].map((item, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/5 p-4">
                  <p className="text-xs text-white/30 mb-2">{item.label}</p>
                  <p className={`text-xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                    {item.text ? item.value : `${item.value}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-4 text-center">Core USPs</p>
          <h2 className="text-4xl font-black tracking-tighter text-center mb-16">Built different.</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Brain,
                title: 'AI Validation Engine',
                desc: 'Gemini AI analyzes your idea against market data, trend signals, and competitive landscape to surface real insights.',
                accent: 'violet'
              },
              {
                icon: TrendingUp,
                title: 'Trend + Demand Scoring',
                desc: 'Our proprietary scoring formula weights mentions growth, search volume, sentiment, and competition into a single actionable score.',
                accent: 'cyan'
              },
              {
                icon: BarChart3,
                title: 'Data-Backed Decisions',
                desc: 'Every verdict is backed by quantitative data—trend stage classification, confidence intervals, and semantic similarity matching.',
                accent: 'emerald'
              },
              {
                icon: Target,
                title: 'AI Improvement Suggestions',
                desc: 'Don\'t just get a score. Get specific, ranked suggestions to pivot, position, or improve your product idea.',
                accent: 'amber'
              },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-${f.accent}-500/10 border border-${f.accent}-500/20 flex items-center justify-center mb-5`}>
                  <f.icon size={18} className={`text-${f.accent}-400`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase mb-4 text-center">RAG Pipeline</p>
          <h2 className="text-4xl font-black tracking-tighter text-center mb-16">How it works.</h2>

          <div className="space-y-4">
            {[
              { step: '01', title: 'Input your idea', desc: 'Name your product, category, target market, and estimated cost.' },
              { step: '02', title: 'Embedding + semantic search', desc: 'We generate a vector embedding and retrieve similar validated ideas for context.' },
              { step: '03', title: 'Scoring engine runs', desc: 'Our algorithm weights trend signals, sentiment, demand, and competition into a single score.' },
              { step: '04', title: 'AI analysis & verdict', desc: 'Gemini AI returns a structured verdict with improvement suggestions and confidence score.' },
            ].map((s, i) => (
              <div key={i} className="flex gap-6 items-start p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                <span className="text-4xl font-black text-white/8 leading-none flex-shrink-0">{s.step}</span>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-sm text-white/40">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-5xl font-black tracking-tighter mb-6">
            Stop guessing.<br />Start validating.
          </h2>
          <p className="text-white/40 mb-10">Free to try. No credit card required.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all">
            Validate your idea now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-white/20 text-xs">
        © 2025 ProductIQ — AI Product Intelligence Platform
      </footer>
    </main>
  );
}
