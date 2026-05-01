export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin' | 'moderator';
  /**
   * Primary subscription tier stored in Firestore.
   * Values intentionally differ from `subscriptionTier` — `starter` maps to
   * the intermediate tier.  This is the authoritative field used by application
   * logic; `subscriptionTier` is the spec-aligned alias for external compatibility.
   */
  tier: 'free' | 'starter' | 'pro';
  /**
   * Spec-aligned subscription tier field (free | premium | pro).
   * `premium` corresponds to `tier: 'starter'` in the primary field.
   * Optional for backward compatibility with records written before this field
   * was added.
   */
  subscriptionTier?: 'free' | 'premium' | 'pro';
  affiliateId?: string;
  createdAt: Date;
}

export interface Prompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  /** Detected {{parameter}} placeholders within the prompt content */
  parameters: string[];
  /** Whether this prompt is publicly visible, accessible via direct link only (unlisted), or private */
  visibility: 'public' | 'private' | 'unlisted';
  /** Price in USD cents; 0 means free */
  price: number;
  /** Monotonically increasing edit counter */
  version: number;
  /** UIDs of users currently collaborating on this prompt */
  collaborators: string[];
  /** Category for marketplace discovery */
  category?: string;
  /** Average rating 0–5 */
  rating?: number;
  /** Number of ratings */
  ratingCount?: number;
  /** Number of times purchased */
  salesCount?: number;
  /** Short description shown in the marketplace */
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  parameters: string[];
  version: number;
  savedAt: Date;
}

export interface CollaboratorPresence {
  userId: string;
  displayName: string;
  photoURL: string;
  lastSeen: Date;
  /** Cursor position (character offset) within the content textarea */
  cursorPosition: number;
}

export interface AISuggestion {
  type: 'keyword' | 'phrasing' | 'topic';
  text: string;
  description: string;
  relevance: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceListing {
  id: string;
  promptId: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  category: string;
  price: number;
  popularityScore: number;
  salesCount: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  affiliateLinks: AffiliateLink[];
  createdAt: Date;
}

export interface AffiliateLink {
  affiliateId: string;
  url: string;
  clicks: number;
  conversions: number;
}

export interface Affiliate {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  commissionRate: number;
  referrals: AffiliateReferral[];
  totalEarnings: number;
  pendingPayout: number;
  createdAt: Date;
}

export interface AffiliateReferral {
  paymentId: string;
  promptId: string;
  amount: number;
  commission: number;
  createdAt: Date;
}

export type PaymentMethod = 'stripe' | 'paypal' | 'cashapp' | 'gcash' | 'google_pay' | 'credit_card';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  promptId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  affiliateId?: string;
  createdAt: Date;
}

export type PromptCategory =
  | 'writing'
  | 'coding'
  | 'business'
  | 'education'
  | 'creative'
  | 'productivity'
  | 'marketing'
  | 'research'
  | 'other';

