import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation & User Guide',
  description:
    'Learn how to use PromptSphere: create prompts, publish to the marketplace, set up affiliates, and manage payments.',
  openGraph: {
    title: 'PromptSphere Documentation',
    description: 'Complete guide to using PromptSphere — the AI Prompt Marketplace.',
    type: 'website',
  },
};

const SECTIONS = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    content: [
      {
        heading: 'Create Your Account',
        body: 'Sign in with your Google account on the Login page. Your profile is automatically created in Firebase with a free-tier plan. You can upgrade to Starter or Pro at any time from your dashboard.',
      },
      {
        heading: 'Navigate the Dashboard',
        body: 'After signing in you land on your Dashboard. From here you can create, edit, and delete prompts. The sidebar lets you switch between My Prompts, Profile, Marketplace, and the Affiliate section.',
      },
      {
        heading: 'Create Your First Prompt',
        body: 'Click "+ New Prompt", fill in the title, content, and tags. Use {{variable}} syntax to mark dynamic parameters. Set visibility to Public (listed in search), Unlisted (accessible via direct link only), or Private (only you). Add a price or leave at $0 for free, then save.',
      },
    ],
  },
  {
    id: 'marketplace',
    icon: '🛒',
    title: 'Prompt Marketplace',
    content: [
      {
        heading: 'Publishing to the Marketplace',
        body: 'Set your prompt visibility to "Public" and save it. Then open the prompt detail view and click "Publish to Marketplace". You can assign a category, description, and price. The listing immediately appears in the marketplace feed.',
      },
      {
        heading: 'Discovery & Filtering',
        body: 'The /marketplace page lets you filter by category (Writing, Coding, Business, etc.), sort by Trending / Top Rated / Price / Newest, and search by keyword. Free and paid filters are also available.',
      },
      {
        heading: 'Trending Feed',
        body: 'When you apply a category filter or change the sort order from the default, a Trending Now section appears at the top showing the 4 prompts with the highest popularity score across all categories. Popularity score is weighted by views and purchases. The default "All / Trending" view already surfaces these prompts so the section only appears when browsing a filtered subset.',
      },
      {
        heading: 'Ratings & Reviews',
        body: 'After purchasing or downloading a free prompt, you can leave a 1–5 star rating. Each user can rate a prompt once and update their rating at any time. The listing\'s average score is updated automatically using an incremental Firestore transaction so no full-collection scan is needed.',
      },
    ],
  },
  {
    id: 'affiliate',
    icon: '🤝',
    title: 'Affiliate Program',
    content: [
      {
        heading: 'Joining the Affiliate Program',
        body: 'Go to your Dashboard and click "Join Affiliate Program" in the sidebar. Your unique affiliate ID is generated instantly and stored in Firebase. You earn 10% commission on every sale made through your referral link.',
      },
      {
        heading: 'Generating Referral Links',
        body: 'Open any marketplace listing while logged in. Your unique referral URL appears in the purchase sidebar — click "Copy Referral Link". Share it on social media, blogs, or communities to earn commissions.',
      },
      {
        heading: 'Tracking Earnings',
        body: 'Your Affiliate Dashboard shows total earnings, pending payout, and a full referral history. Each row shows the prompt purchased, the sale amount, and your commission.',
      },
      {
        heading: 'Commission Structure',
        body: 'Default commission rate: 10% of every sale. Admins can customise commission rates per affiliate. Payouts are processed monthly to your chosen payment method (PayPal, Bank Transfer, etc.).',
      },
    ],
  },
  {
    id: 'payments',
    icon: '💳',
    title: 'Payments',
    content: [
      {
        heading: 'Supported Payment Methods',
        body: 'PromptSphere supports Credit / Debit Card (via Stripe), PayPal, Google Pay, Cash App, and GCash. Simply select your preferred method during checkout and follow the on-screen prompts.',
      },
      {
        heading: 'Security',
        body: 'The checkout flow in this version is a demonstration UI. All payment steps are simulated: no real card data is transmitted or stored, and no actual charges are made. In a production deployment, card fields would be replaced with provider-hosted elements (e.g. Stripe Elements) so that raw card data never touches the application server. Payment records are stored in Firestore with restricted access.',
      },
      {
        heading: 'Refunds',
        body: 'If a prompt doesn\'t match its description, contact support within 7 days for a full refund. Refunds are processed back to the original payment method.',
      },
    ],
  },
  {
    id: 'seo',
    icon: '📈',
    title: 'SEO & Growth',
    content: [
      {
        heading: 'On-Page SEO',
        body: 'Every marketplace listing has a dedicated URL at /marketplace/{id} with meta titles, descriptions, canonical URLs, and JSON-LD Product schema markup — automatically generated from your prompt\'s title, description, and category.',
      },
      {
        heading: 'Social Sharing',
        body: 'OpenGraph and Twitter Card meta tags are applied to every marketplace listing so shared links render rich previews with your prompt title and description.',
      },
      {
        heading: 'Affiliate Backlinks',
        body: 'When affiliates share your prompt across the web, each referral link creates a natural backlink to your listing, boosting domain authority and organic search ranking.',
      },
      {
        heading: 'Sitemap & Robots',
        body: 'The sitemap at /sitemap.xml is auto-generated and includes all main public pages. The robots.txt at /robots.txt is configured to allow all crawlers on public pages while blocking dashboard and admin routes.',
      },
    ],
  },
  {
    id: 'admin',
    icon: '⚙️',
    title: 'Admin Dashboard',
    content: [
      {
        heading: 'Accessing the Admin Panel',
        body: 'The admin panel is accessible only to accounts whose email matches NEXT_PUBLIC_ADMIN_EMAIL. Navigate to /admin or click "Admin Panel" in the dashboard sidebar.',
      },
      {
        heading: 'User Management',
        body: 'View all registered users, their subscription tiers, roles, and join dates. Use the search bar to find specific users. You can modify roles from the Users tab.',
      },
      {
        heading: 'Payment Management',
        body: 'The Payments tab shows all transactions with amount, method, status, and timestamp. Use the Refund button on any completed or pending payment to mark it as refunded. In production, trigger the provider refund through their API first.',
      },
      {
        heading: 'Affiliate Management',
        body: 'The Affiliates tab lists all affiliates with their commission rates, total earnings, and pending payouts. You can edit commission rates and approve payouts from here.',
      },
      {
        heading: 'Spam Control & Moderation',
        body: 'Flag or remove listings reported as spam from the Spam Control tab. Accounts with the "moderator" role have Firestore-level permission to delete marketplace listings. Full moderator UI tooling (dedicated feed, ban actions) is planned for a future release. Banned users are prevented from publishing new listings.',
      },
      {
        heading: 'Fee Configuration',
        body: 'Set the platform fee percentage and default affiliate commission rate from the Settings tab. These values determine how revenue is split between the platform, affiliate, and seller on each transaction.',
      },
      {
        heading: 'API Keys',
        body: 'Manage third-party API keys (Stripe publishable key, Firebase config, etc.) from the API Keys tab. Never expose secret keys on the client side.',
      },
    ],
  },
  {
    id: 'firebase',
    icon: '🔥',
    title: 'Firebase Schema',
    content: [
      {
        heading: 'Collections Overview',
        body: 'PromptSphere uses seven Firestore top-level collections: users, prompts, marketplace, payments, affiliates, activityLogs, and collaborationSessions.',
      },
      {
        heading: 'users',
        body: 'Fields: uid, email, displayName, photoURL, role (user|admin|moderator), tier (free|starter|pro), subscriptionTier (free|premium|pro), affiliateId, createdAt.',
      },
      {
        heading: 'prompts',
        body: 'Fields: promptId, userId, title, content, category, price, visibility (public|private|unlisted), tags, parameters, version, collaborators, rating, ratingCount, salesCount, description, createdAt, updatedAt. Unlisted prompts are excluded from public prompt feeds (getPublicPrompts) but are still accessible via direct link and can be published to the Marketplace. Sub-collection: versions.',
      },
      {
        heading: 'marketplace',
        body: 'Fields: listingId, promptId, ownerId, ownerName, title, description, category, price, popularityScore, salesCount, rating, ratingCount, tags, affiliateLinks, createdAt. Sub-collection: ratings.',
      },
      {
        heading: 'payments',
        body: 'Fields: paymentId, userId, promptId, amount, currency, method, status, affiliateId, createdAt. Refunded payments additionally include: refundedAt (timestamp), refundedBy (admin uid).',
      },
      {
        heading: 'affiliates',
        body: 'Fields: affiliateId, userId, displayName, email, commissionRate, referrals[], totalEarnings, pendingPayout, createdAt.',
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            📖 <span className="text-gradient">Documentation</span> & User Guide
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to know about PromptSphere — from creating your first prompt
            to running a profitable affiliate campaign.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="glass-card rounded-2xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Table of Contents</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-gray-400 hover:text-brand-purple transition-colors text-sm"
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{section.icon}</span>
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
              </div>
              <div className="space-y-6">
                {section.content.map((item, i) => (
                  <div key={i} className="glass-card rounded-xl p-6">
                    <h3 className="text-base font-semibold text-brand-purple mb-2">
                      {item.heading}
                    </h3>
                    <p className="text-gray-300 leading-relaxed text-sm">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 glass-card rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-gray-400 mb-6">Join thousands of creators on PromptSphere today.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login" className="btn-gradient px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              Sign Up Free
            </Link>
            <Link href="/marketplace" className="px-6 py-3 rounded-xl font-semibold glass-card border border-brand-purple/30 hover:border-brand-purple/60 transition-colors">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
