'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  getAffiliateByUserId,
  createAffiliate,
  upsertMarketplaceListing,
  getUserPayments,
} from '@/lib/firestore';
import PromptCard from '@/components/PromptCard';
import PromptEditor from '@/components/PromptEditor';
import { Prompt, Affiliate, Payment } from '@/types';
import Link from 'next/link';
import { signOut } from '@/lib/auth';
import { extractParameters } from '@/lib/aiSuggestions';
import { DEFAULT_COMMISSION_RATE } from '@/lib/utils';

export default function DashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [activeSection, setActiveSection] = useState<'prompts' | 'profile' | 'affiliate' | 'purchases'>('prompts');
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [purchases, setPurchases] = useState<Payment[]>([]);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  /** null = create mode; a Prompt object = edit mode; undefined = hidden */
  const [editorPrompt, setEditorPrompt] = useState<Prompt | null | undefined>(undefined);
  const [publishingPromptId, setPublishingPromptId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadPrompts = useCallback(async () => {
    if (!user) return;
    setLoadingPrompts(true);
    try {
      const data = await getUserPrompts(user.uid);
      setPrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  }, [user]);

  const loadAffiliate = useCallback(async () => {
    if (!user) return;
    setAffiliateLoading(true);
    try {
      const aff = await getAffiliateByUserId(user.uid);
      setAffiliate(aff);
    } catch (err) {
      console.error('Error loading affiliate:', err);
    } finally {
      setAffiliateLoading(false);
    }
  }, [user]);

  const loadPurchases = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserPayments(user.uid);
      setPurchases(data);
    } catch (err) {
      console.error('Error loading purchases:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPrompts();
      loadAffiliate();
      loadPurchases();
    }
  }, [user, loadPrompts, loadAffiliate, loadPurchases]);

  const handleSavePrompt = useCallback(
    async (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<number | undefined> => {
      if (!user) return undefined;

      if (editorPrompt && editorPrompt.id) {
        // Editing an existing prompt.
        // version is intentionally omitted — the transaction inside updatePrompt
        // atomically derives and returns the new version.
        const newVersion = await updatePrompt(editorPrompt.id, {
          title: data.title,
          content: data.content,
          tags: data.tags,
          parameters: extractParameters(data.content),
          visibility: data.visibility,
          price: data.price,
        });
        setEditorPrompt(undefined);
        await loadPrompts();
        return newVersion;
      } else {
        // Creating a new prompt — always start at version 1.
        await createPrompt({
          ...data,
          parameters: extractParameters(data.content),
          version: 1,
        });
        setEditorPrompt(undefined);
        await loadPrompts();
        return undefined;
      }
    },
    [user, editorPrompt, loadPrompts]
  );

  const handleDeletePrompt = async (id: string) => {
    if (!user) return;
    try {
      await deletePrompt(id, user.uid);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleJoinAffiliate = async () => {
    if (!user) return;
    setJoinLoading(true);
    try {
      await createAffiliate({
        userId: user.uid,
        displayName: user.displayName ?? 'Anonymous',
        email: user.email ?? '',
        commissionRate: DEFAULT_COMMISSION_RATE,
      });
      await loadAffiliate();
    } catch (err) {
      console.error('Error joining affiliate programme:', err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handlePublishToMarketplace = async (prompt: Prompt) => {
    if (!user) return;
    setPublishingPromptId(prompt.id);
    try {
      await upsertMarketplaceListing({
        promptId: prompt.id,
        ownerId: user.uid,
        ownerName: user.displayName ?? 'Anonymous',
        title: prompt.title,
        description: prompt.description ?? prompt.content.slice(0, 200),
        category: prompt.category ?? 'other',
        price: prompt.price,
        popularityScore: 0,
        salesCount: 0,
        rating: 0,
        ratingCount: 0,
        tags: prompt.tags,
        affiliateLinks: [],
      });
    } catch (err) {
      console.error('Error publishing to marketplace:', err);
    } finally {
      setPublishingPromptId(null);
    }
  };

  const handleCopyAffiliateLink = async (promptId: string) => {
    if (!affiliate) return;
    const url = `${window.location.origin}/marketplace/${promptId}?ref=${affiliate.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedPromptId(promptId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col fixed h-full">
        <div className="p-6 border-b border-dark-700">
          <Link href="/" className="text-xl font-bold text-gradient">PromptSphere</Link>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveSection('prompts')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
              activeSection === 'prompts'
                ? 'bg-brand-purple/20 text-brand-purple'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>📝</span> My Prompts
          </button>
          <button
            onClick={() => setActiveSection('affiliate')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
              activeSection === 'affiliate'
                ? 'bg-brand-purple/20 text-brand-purple'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>🤝</span> Affiliate
          </button>
          <button
            onClick={() => setActiveSection('purchases')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
              activeSection === 'purchases'
                ? 'bg-brand-purple/20 text-brand-purple'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>📦</span> My Purchases
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
              activeSection === 'profile'
                ? 'bg-brand-purple/20 text-brand-purple'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>👤</span> Profile
          </button>
          <Link
            href="/marketplace"
            className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-700"
          >
            <span>🛒</span> Marketplace
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-brand-cyan hover:bg-dark-700"
            >
              <span>⚙️</span> Admin Panel
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-dark-700">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-dark-700 transition-colors text-left flex items-center gap-3"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {activeSection === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>
            <div className="glass-card rounded-2xl p-8 max-w-lg">
              <div className="flex items-center gap-6 mb-6">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-brand-purple/50" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-brand-purple/30 flex items-center justify-center text-3xl text-brand-purple font-bold">
                    {user.displayName?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                  <p className="text-gray-400">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                    {isAdmin ? 'Admin' : 'Free Tier'}
                  </span>
                </div>
              </div>
              <div className="border-t border-dark-700 pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Total Prompts</span>
                    <p className="text-white font-semibold">{prompts.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Member Since</span>
                    <p className="text-white font-semibold">
                      {user.metadata.creationTime
                        ? new Date(user.metadata.creationTime).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'affiliate' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">🤝 Affiliate Programme</h1>
            {affiliateLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !affiliate ? (
              <div className="glass-card rounded-2xl p-8 max-w-lg">
                <div className="text-center mb-6">
                  <p className="text-5xl mb-4">🤝</p>
                  <h2 className="text-xl font-bold text-white mb-2">Join the Affiliate Programme</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Earn 10% commission on every sale made through your unique referral links.
                    Share prompts from the marketplace and get paid automatically.
                  </p>
                </div>
                <div className="space-y-3 mb-6 text-sm">
                  {[
                    '💰 10% commission on every sale',
                    '🔗 Unique referral links for every listing',
                    '📊 Real-time tracking dashboard',
                    '💳 Monthly payouts via PayPal or bank transfer',
                  ].map((b) => (
                    <div key={b} className="flex items-center gap-2 text-gray-300">
                      <span>✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleJoinAffiliate}
                  disabled={joinLoading}
                  className="w-full btn-gradient py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {joinLoading ? 'Joining…' : 'Join Affiliate Programme'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Commission Rate', value: `${(affiliate.commissionRate * 100).toFixed(0)}%`, icon: '💸', color: 'text-brand-purple' },
                    { label: 'Total Referrals', value: affiliate.referrals.length, icon: '🔗', color: 'text-brand-cyan' },
                    { label: 'Total Earned', value: `$${(affiliate.totalEarnings / 100).toFixed(2)}`, icon: '💰', color: 'text-green-400' },
                    { label: 'Pending Payout', value: `$${(affiliate.pendingPayout / 100).toFixed(2)}`, icon: '⏳', color: 'text-yellow-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-card rounded-xl p-4">
                      <span className="text-2xl">{stat.icon}</span>
                      <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Affiliate ID */}
                <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Your Affiliate ID</p>
                    <p className="text-brand-cyan font-mono text-sm mt-0.5">{affiliate.id}</p>
                  </div>
                  <Link
                    href="/marketplace"
                    className="text-sm text-brand-purple hover:text-brand-pink transition-colors"
                  >
                    Browse & share prompts →
                  </Link>
                </div>

                {/* Referral links for public prompts */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-dark-700">
                    <h2 className="text-base font-semibold text-white">Your Public Prompts — Referral Links</h2>
                  </div>
                  {prompts.filter((p) => p.visibility === 'public').length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 text-sm">Make some prompts public to generate referral links.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-dark-700">
                      {prompts
                        .filter((p) => p.visibility === 'public')
                        .map((p) => (
                          <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                            <p className="text-white text-sm truncate flex-1">{p.title}</p>
                            <button
                              onClick={() => handleCopyAffiliateLink(p.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 hover:border-brand-cyan/50 transition-colors shrink-0"
                            >
                              {copiedPromptId === p.id ? '✓ Copied!' : '📋 Copy Link'}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Referral history */}
                {affiliate.referrals.length > 0 && (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-dark-700">
                      <h2 className="text-base font-semibold text-white">Referral History</h2>
                    </div>
                    <div className="divide-y divide-dark-700">
                      {affiliate.referrals.map((r, i) => (
                        <div key={i} className="p-4 flex items-center justify-between text-sm">
                          <div>
                            <p className="text-gray-300 font-mono text-xs">{r.promptId.slice(0, 12)}…</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {r.createdAt instanceof Date
                                ? r.createdAt.toLocaleDateString()
                                : new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">+${(r.commission / 100).toFixed(2)}</p>
                            <p className="text-gray-500 text-xs">from ${(r.amount / 100).toFixed(2)} sale</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'purchases' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">📦 My Purchases</h1>
            {purchases.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl">
                <p className="text-5xl mb-4">📦</p>
                <p className="text-gray-400 text-lg">No purchases yet.</p>
                <Link href="/marketplace" className="mt-4 inline-block text-brand-purple hover:text-brand-pink transition-colors text-sm">
                  Browse the Marketplace →
                </Link>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="divide-y divide-dark-700">
                  {purchases.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/marketplace/${p.promptId}`}
                          className="text-white hover:text-brand-purple transition-colors text-sm font-medium"
                        >
                          View Prompt →
                        </Link>
                        <p className="text-gray-500 text-xs mt-0.5 capitalize">{p.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">${(p.amount / 100).toFixed(2)}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            p.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'prompts' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-white">My Prompts</h1>
              <button
                onClick={() => setEditorPrompt(null)}
                className="btn-gradient px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                + New Prompt
              </button>
            </div>

            {/* Inline editor (create or edit) */}
            {editorPrompt !== undefined && (
              <div className="mb-8">
                <PromptEditor
                  prompt={editorPrompt ?? undefined}
                  userId={user.uid}
                  displayName={user.displayName ?? 'Anonymous'}
                  photoURL={user.photoURL ?? ''}
                  onSave={handleSavePrompt}
                  onCancel={() => setEditorPrompt(undefined)}
                  existingPrompts={prompts}
                />
              </div>
            )}

            {loadingPrompts ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl">
                <p className="text-5xl mb-4">📝</p>
                <p className="text-gray-400 text-lg">No prompts yet. Create your first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="flex flex-col gap-2">
                    <PromptCard
                      prompt={prompt}
                      onDelete={handleDeletePrompt}
                      onEdit={(p) => setEditorPrompt(p)}
                    />
                    {prompt.visibility === 'public' && (
                      <button
                        onClick={() => handlePublishToMarketplace(prompt)}
                        disabled={publishingPromptId === prompt.id}
                        className="text-xs py-1.5 px-3 rounded-lg bg-brand-purple/10 text-brand-purple border border-brand-purple/20 hover:border-brand-purple/50 transition-colors disabled:opacity-50"
                      >
                        {publishingPromptId === prompt.id ? 'Publishing…' : '🛒 Publish to Marketplace'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
