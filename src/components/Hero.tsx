'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-purple/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-pink/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full glass-card text-sm text-brand-purple mb-8 neon-border">
          <span className="w-2 h-2 bg-brand-purple rounded-full mr-2 animate-pulse" />
          Now in Beta — Join 10,000+ creators
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          <span className="text-white">The</span>{' '}
          <span className="neon-text text-brand-purple">AI Prompt</span>
          <br />
          <span className="text-gradient">Marketplace</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
          Discover, create, and share powerful AI prompts. Supercharge your workflow
          with battle-tested prompts from the community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-gradient px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity neon-border"
          >
            Get Started Free
          </Link>
          <Link
            href="/#features"
            className="px-8 py-4 rounded-xl font-semibold text-lg glass-card border border-brand-purple/30 hover:border-brand-purple/60 transition-colors"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
          <div>
            <div className="text-3xl font-bold text-brand-purple">10K+</div>
            <div className="text-gray-400 text-sm mt-1">Prompts</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-brand-pink">5K+</div>
            <div className="text-gray-400 text-sm mt-1">Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-brand-cyan">99%</div>
            <div className="text-gray-400 text-sm mt-1">Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}
