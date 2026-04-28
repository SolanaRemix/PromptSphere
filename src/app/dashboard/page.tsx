'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPrompts, createPrompt, updatePrompt, deletePrompt } from '@/lib/firestore';
import PromptCard from '@/components/PromptCard';
import PromptEditor from '@/components/PromptEditor';
import { Prompt } from '@/types';
import Link from 'next/link';
import { signOut } from '@/lib/auth';
import { extractParameters } from '@/lib/aiSuggestions';

export default function DashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [activeSection, setActiveSection] = useState<'prompts' | 'profile'>('prompts');

  /** null = create mode; a Prompt object = edit mode; undefined = hidden */
  const [editorPrompt, setEditorPrompt] = useState<Prompt | null | undefined>(undefined);

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

  useEffect(() => {
    if (user) {
      loadPrompts();
    }
  }, [user, loadPrompts]);

  const handleSavePrompt = useCallback(
    async (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return;

      if (editorPrompt && editorPrompt.id) {
        // Editing an existing prompt
        await updatePrompt(editorPrompt.id, {
          title: data.title,
          content: data.content,
          tags: data.tags,
          parameters: extractParameters(data.content),
          visibility: data.visibility,
          price: data.price,
          version: data.version,
        });
      } else {
        // Creating a new prompt
        await createPrompt({
          ...data,
          parameters: extractParameters(data.content),
        });
      }
      setEditorPrompt(undefined);
      await loadPrompts();
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
        <nav className="flex-1 p-4 space-y-2">
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
            onClick={() => setActiveSection('profile')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
              activeSection === 'profile'
                ? 'bg-brand-purple/20 text-brand-purple'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span>👤</span> Profile
          </button>
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
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onDelete={handleDeletePrompt}
                    onEdit={(p) => setEditorPrompt(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
