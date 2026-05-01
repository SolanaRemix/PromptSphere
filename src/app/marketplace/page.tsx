'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMarketplaceListings } from '@/lib/firestore';
import MarketplaceCard from '@/components/MarketplaceCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { MarketplaceListing } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getAffiliateByUserId } from '@/lib/firestore';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'writing', label: '✍️ Writing' },
  { value: 'coding', label: '💻 Coding' },
  { value: 'business', label: '💼 Business' },
  { value: 'education', label: '📚 Education' },
  { value: 'creative', label: '🎨 Creative' },
  { value: 'productivity', label: '⚡ Productivity' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'research', label: '🔬 Research' },
  { value: 'other', label: '🌐 Other' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'popularityScore', label: '🔥 Trending' },
  { value: 'rating', label: '⭐ Top Rated' },
  { value: 'price', label: '💰 Price' },
  { value: 'createdAt', label: '🆕 Newest' },
];

function MarketplaceInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [trendingListings, setTrendingListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>(searchParams.get('category') ?? 'all');
  const [sortBy, setSortBy] = useState<'popularityScore' | 'price' | 'rating' | 'createdAt'>('popularityScore');
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [affiliateId, setAffiliateId] = useState<string | undefined>(undefined);

  // Load affiliate ID so we can generate referral links
  useEffect(() => {
    if (!user) return;
    getAffiliateByUserId(user.uid).then((aff) => {
      if (aff) setAffiliateId(aff.id);
    });
  }, [user]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const isDefaultView = category === 'all' && sortBy === 'popularityScore';
      const [data, trending] = await Promise.all([
        getMarketplaceListings({ category, sortBy }),
        // Load a separate trending feed only when the user has applied a filter
        // or sort — the default view already shows popular prompts so a
        // duplicate trending row would be redundant.
        !isDefaultView
          ? getMarketplaceListings({ sortBy: 'popularityScore', maxResults: 4 })
          : Promise.resolve([] as MarketplaceListing[]),
      ]);
      setListings(data);
      setTrendingListings(trending);
    } catch (err) {
      console.error('Failed to load marketplace listings:', err);
    } finally {
      setLoading(false);
    }
  }, [category, sortBy]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const filtered = listings.filter((l) => {
    const matchesSearch =
      search.trim() === '' ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      l.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'free' && l.price === 0) ||
      (priceFilter === 'paid' && l.price > 0);

    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      {/* Hero banner */}
      <section className="pt-24 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🛒 Prompt <span className="text-gradient">Marketplace</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover thousands of battle-tested AI prompts. Filter by category, sort by popularity,
            and find the perfect prompt for any task.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        {/* Trending Feed — shown when not filtered to default popularity view */}
        {!loading && trendingListings.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔥</span>
              <h2 className="text-lg font-semibold text-white">Trending Now</h2>
              <span className="text-xs text-gray-500 ml-1">— top prompts by popularity score</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingListings.map((listing) => (
                <MarketplaceCard
                  key={listing.id}
                  listing={listing}
                  affiliateId={affiliateId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="glass-card rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍  Search prompts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple text-sm"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-gray-300 focus:outline-none focus:border-brand-purple text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-gray-300 focus:outline-none focus:border-brand-purple text-sm"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Price */}
          <div className="flex gap-2">
            {(['all', 'free', 'paid'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriceFilter(p)}
                className={`px-3 py-2 rounded-xl text-sm capitalize transition-colors ${
                  priceFilter === p
                    ? 'bg-brand-purple text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-500 text-sm mb-4">
          {loading ? 'Loading…' : `${filtered.length} prompts found`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-400 text-lg">No prompts found matching your filters.</p>
            <button
              onClick={() => { setSearch(''); setCategory('all'); setPriceFilter('all'); }}
              className="mt-4 text-brand-purple hover:text-brand-pink transition-colors text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((listing) => (
              <MarketplaceCard
                key={listing.id}
                listing={listing}
                affiliateId={affiliateId}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MarketplaceInner />
    </Suspense>
  );
}
