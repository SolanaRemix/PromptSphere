'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  getMarketplaceListingByPromptId,
  getPromptById,
  createPayment,
  recordAffiliateReferral,
  getAffiliateByUserId,
  getAffiliateById,
  hasUserPurchasedPrompt,
  ratePrompt,
  incrementPopularityScore,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/PaymentModal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { MarketplaceListing, Prompt, PaymentMethod } from '@/types';
import Link from 'next/link';
import { DEFAULT_COMMISSION_RATE } from '@/lib/utils';

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-lg ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`}>
          ★
        </span>
      ))}
      <span className="text-gray-400 text-sm ml-1">
        {rating.toFixed(1)} ({count} reviews)
      </span>
    </div>
  );
}

function InteractiveStars({ onRate }: { onRate: (stars: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => { setSelected(i); onRate(i); }}
          className={`text-2xl transition-colors ${
            i <= (hovered || selected) ? 'text-yellow-400' : 'text-gray-600'
          }`}
        >
          ★
        </button>
      ))}
      {selected > 0 && <span className="text-gray-400 text-sm ml-2">Thanks for rating!</span>}
    </div>
  );
}

function MarketplaceDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const promptId = params.id as string;
  const refAffiliateId = searchParams.get('ref');

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [copying, setCopying] = useState(false);
  const [userAffiliateId, setUserAffiliateId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [listingData, promptData] = await Promise.all([
          getMarketplaceListingByPromptId(promptId),
          getPromptById(promptId),
        ]);
        setListing(listingData);
        setPrompt(promptData);

        // Track view
        if (listingData) {
          await incrementPopularityScore(listingData.id, 1).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load marketplace detail:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [promptId]);

  useEffect(() => {
    if (!user || !listing) return;
    hasUserPurchasedPrompt(user.uid, promptId).then(setPurchased);
    getAffiliateByUserId(user.uid).then((aff) => {
      if (aff) setUserAffiliateId(aff.id);
    });
  }, [user, listing, promptId]);

  const handlePaymentSuccess = async (method: PaymentMethod) => {
    if (!user || !listing) return;
    try {
      // Write a `pending` payment intent from the client.
      // ⚠️  PRODUCTION NOTE: In a production app a server-side webhook (Stripe,
      // PayPal, etc.) should be responsible for transitioning this record to
      // `completed` after verifying the provider's payment confirmation.
      const paymentId = await createPayment({
        userId: user.uid,
        promptId,
        amount: listing.price,
        currency: 'USD',
        method,
        status: 'pending',
        affiliateId: refAffiliateId ?? undefined,
      });

      // Credit affiliate if referred — use the affiliate's stored commission
      // rate via a direct document lookup (affiliateId == document ID).
      if (refAffiliateId) {
        let commissionRate = DEFAULT_COMMISSION_RATE;
        try {
          const aff = await getAffiliateById(refAffiliateId);
          if (aff) commissionRate = aff.commissionRate;
        } catch {
          // Fall back to the default rate if the lookup fails.
        }
        // Round to nearest integer cent to avoid floating-point drift.
        const commission = Math.round(listing.price * commissionRate);
        await recordAffiliateReferral(refAffiliateId, {
          paymentId,
          promptId,
          amount: listing.price,
          commission,
          createdAt: new Date(),
        }).catch(() => {});
      }

      setPurchased(true);
      setShowPayment(false);
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  const handleCopyAffiliateLink = async () => {
    if (!userAffiliateId) return;
    const url = `${window.location.origin}/marketplace/${promptId}?ref=${userAffiliateId}`;
    await navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleRate = async (stars: number) => {
    if (!user || !listing) return;
    await ratePrompt(listing.id, user.uid, stars).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-dark-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-5xl">😕</p>
          <p className="text-gray-400 text-lg">Prompt not found in the marketplace.</p>
          <Link href="/marketplace" className="text-brand-purple hover:text-brand-pink transition-colors">
            ← Back to Marketplace
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const price = listing.price / 100;

  // JSON-LD schema markup for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'USD',
    },
    aggregateRating: listing.ratingCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: listing.rating,
      reviewCount: listing.ratingCount,
    } : undefined,
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/marketplace" className="hover:text-brand-purple transition-colors">
            Marketplace
          </Link>
          <span>›</span>
          <span className="text-gray-300 capitalize">{listing.category}</span>
          <span>›</span>
          <span className="text-gray-400 truncate max-w-xs">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title + category */}
            <div>
              <span className="px-3 py-1 text-xs rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 capitalize">
                {listing.category}
              </span>
              <h1 className="text-3xl font-bold text-white mt-3 mb-2">{listing.title}</h1>
              <p className="text-gray-400">by {listing.ownerName}</p>
            </div>

            {/* Rating */}
            <StarRating rating={listing.rating} count={listing.ratingCount} />

            {/* Description */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
              <p className="text-gray-300 leading-relaxed">{listing.description}</p>
            </div>

            {/* Tags */}
            {listing.tags.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm rounded-full bg-brand-purple/10 text-brand-purple/80 border border-brand-purple/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt preview (if purchased or free) */}
            {(purchased || listing.price === 0) && prompt && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">✅ Prompt Content</h2>
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono bg-dark-800 rounded-xl p-4 overflow-x-auto">
                  {prompt.content}
                </pre>
              </div>
            )}

            {/* Rate this prompt */}
            {user && (purchased || listing.price === 0) && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Rate this Prompt</h2>
                <InteractiveStars onRate={handleRate} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Purchase card */}
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <div className="text-3xl font-bold text-brand-purple mb-1">
                {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                <span>🔥 {listing.popularityScore} views</span>
                <span>📦 {listing.salesCount} sold</span>
              </div>

              {!user ? (
                <Link
                  href="/login"
                  className="block w-full text-center btn-gradient py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Sign In to Purchase
                </Link>
              ) : purchased || listing.price === 0 ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-semibold bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                >
                  ✓ {listing.price === 0 ? 'Free — Added to Library' : 'Purchased'}
                </button>
              ) : (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full btn-gradient py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Purchase for ${price.toFixed(2)}
                </button>
              )}

              {/* Affiliate link */}
              {user && userAffiliateId && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-xs text-gray-500 mb-2">Your affiliate link:</p>
                  <button
                    onClick={handleCopyAffiliateLink}
                    className="w-full text-xs py-2 px-3 rounded-xl bg-dark-700 text-brand-cyan border border-brand-cyan/20 hover:border-brand-cyan/50 transition-colors truncate"
                  >
                    {copying ? '✓ Copied!' : '📋 Copy Referral Link (10% commission)'}
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="glass-card rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Category</span>
                <span className="text-white capitalize">{listing.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rating</span>
                <span className="text-yellow-400">{listing.rating.toFixed(1)} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sales</span>
                <span className="text-white">{listing.salesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Popularity</span>
                <span className="text-brand-purple">{listing.popularityScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Listed</span>
                <span className="text-white">
                  {listing.createdAt instanceof Date
                    ? listing.createdAt.toLocaleDateString()
                    : new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          listing={listing}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default function MarketplaceDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MarketplaceDetailInner />
    </Suspense>
  );
}
