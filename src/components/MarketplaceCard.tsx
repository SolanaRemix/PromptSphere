'use client';

import Link from 'next/link';
import type { MarketplaceListing } from '@/types';

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  affiliateId?: string;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-xs ${
            i <= full
              ? 'text-yellow-400'
              : i === full + 1 && half
              ? 'text-yellow-300'
              : 'text-gray-600'
          }`}
        >
          ★
        </span>
      ))}
      <span className="text-xs text-gray-500 ml-1">({count})</span>
    </div>
  );
}

export default function MarketplaceCard({ listing, affiliateId }: MarketplaceCardProps) {
  const href = affiliateId
    ? `/marketplace/${listing.promptId}?ref=${affiliateId}`
    : `/marketplace/${listing.promptId}`;

  const price = listing.price / 100;

  return (
    <Link href={href} className="block">
      <div className="glass-card rounded-xl p-5 hover:neon-border transition-all duration-300 h-full flex flex-col">
        {/* Category badge */}
        <div className="flex items-start justify-between mb-3">
          <span className="px-2 py-0.5 text-xs rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 capitalize">
            {listing.category}
          </span>
          <span className="text-lg font-bold text-brand-purple">
            {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">{listing.title}</h3>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-3 line-clamp-3 flex-1">{listing.description}</p>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-brand-purple/10 text-brand-purple/80 border border-brand-purple/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-dark-700 flex items-center justify-between">
          <StarRating rating={listing.rating} count={listing.ratingCount} />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🔥 {listing.popularityScore}</span>
            <span>📦 {listing.salesCount} sold</span>
          </div>
        </div>

        {/* Owner */}
        <p className="text-xs text-gray-600 mt-2">by {listing.ownerName}</p>
      </div>
    </Link>
  );
}
