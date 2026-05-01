'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { generateSuggestions, extractParameters } from '@/lib/aiSuggestions';
import { getPromptVersions } from '@/lib/firestore';
import type { Prompt, PromptVersion, AISuggestion } from '@/types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ children, color = 'purple' }: { children: React.ReactNode; color?: 'purple' | 'cyan' | 'green' | 'yellow' | 'red' }) {
  const colors: Record<string, string> = {
    purple: 'bg-brand-purple/20 text-brand-purple border-brand-purple/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
    green: 'bg-green-500/20 text-green-400 border-green-400/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
    red: 'bg-red-500/20 text-red-400 border-red-400/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${colors[color]}`}>
      {children}
    </span>
  );
}

function SuggestionTypeIcon({ type }: { type: AISuggestion['type'] }) {
  if (type === 'keyword') return <span title="Keyword suggestion">🏷️</span>;
  if (type === 'phrasing') return <span title="Phrasing improvement">✏️</span>;
  return <span title="Topic idea">💡</span>;
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

interface PromptEditorProps {
  /** Existing prompt to edit; undefined means "create new". */
  prompt?: Prompt;
  userId: string;
  displayName: string;
  photoURL: string;
  /** Called when the user saves successfully. Returns the persisted version number (edit) or undefined (create). */
  onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number | undefined>;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Existing prompts for AI suggestion context. */
  existingPrompts?: Prompt[];
}

export default function PromptEditor({
  prompt,
  userId,
  displayName,
  photoURL,
  onSave,
  onCancel,
  existingPrompts = [],
}: PromptEditorProps) {
  // ---- Local state ---------------------------------------------------------
  const [title, setTitle] = useState(prompt?.title ?? '');
  const [content, setContent] = useState(prompt?.content ?? '');
  const [tags, setTags] = useState(prompt?.tags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>(prompt?.visibility ?? 'private');
  const [price, setPrice] = useState(prompt?.price ?? 0);
  const [version, setVersion] = useState(prompt?.version ?? 1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- AI suggestions ------------------------------------------------------
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionFilter, setSuggestionFilter] = useState<AISuggestion['type'] | 'all'>('all');

  // ---- Version history -----------------------------------------------------
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // ---- Active tab ----------------------------------------------------------
  const [activePanel, setActivePanel] = useState<'editor' | 'suggestions' | 'versions' | 'collab'>('editor');

  // ---- Reset all local state when the prompt being edited changes ----------
  useEffect(() => {
    setTitle(prompt?.title ?? '');
    setContent(prompt?.content ?? '');
    setTags(prompt?.tags.join(', ') ?? '');
    setVisibility(prompt?.visibility ?? 'private');
    setPrice(prompt?.price ?? 0);
    setVersion(prompt?.version ?? 1);
    setSaveError(null);
    setVersions([]);
    setActivePanel('editor');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt?.id]);

  // ---- Derived state -------------------------------------------------------
  const parameters = extractParameters(content);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // ---- Real-time collaboration (only when editing an existing prompt) ------
  const { collaborators, isSaving, handleLocalChange, saveVersion } = useCollaboration({
    promptId: prompt?.id ?? '__new__',
    userId,
    displayName,
    photoURL,
    onRemoteChange: useCallback((remote: Prompt) => {
      // Accept remote changes only if the remote version is newer
      setVersion((prev) => {
        if (remote.version > prev) {
          setTitle(remote.title);
          setContent(remote.content);
          setTags(remote.tags.join(', '));
          setVisibility(remote.visibility);
          setPrice(remote.price);
          return remote.version;
        }
        return prev;
      });
    }, []),
  });

  // ---- Refresh AI suggestions whenever content/tags change -----------------
  useEffect(() => {
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const newSuggestions = generateSuggestions(content, tagList, existingPrompts);
    setSuggestions(newSuggestions);
  }, [content, tags, existingPrompts]);

  // ---- Propagate local changes to collaboration system --------------------
  const propagateChange = useCallback(
    (
      updates: Partial<Pick<Prompt, 'title' | 'content' | 'tags' | 'parameters' | 'visibility' | 'price'>>,
      cursorPos?: number
    ) => {
      if (!prompt?.id) return; // new prompts don't sync until saved
      handleLocalChange(updates, version, cursorPos ?? contentRef.current?.selectionStart ?? 0);
    },
    [prompt?.id, handleLocalChange, version]
  );

  // ---- Load version history ------------------------------------------------
  const loadVersions = async () => {
    if (!prompt?.id) return;
    setLoadingVersions(true);
    try {
      const data = await getPromptVersions(prompt.id);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleShowVersions = () => {
    setActivePanel('versions');
    if (versions.length === 0) loadVersions();
  };

  // ---- Restore a previous version -----------------------------------------
  const handleRestoreVersion = (v: PromptVersion) => {
    setTitle(v.title);
    setContent(v.content);
    setTags(v.tags.join(', '));
    setActivePanel('editor');
  };

  // ---- Apply an AI suggestion ----------------------------------------------
  const handleApplySuggestion = (suggestion: AISuggestion) => {
    if (suggestion.type === 'keyword') {
      const existing = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (!existing.includes(suggestion.text)) {
        const newTags = [...existing, suggestion.text].join(', ');
        setTags(newTags);
        propagateChange({ tags: newTags.split(',').map((t) => t.trim()).filter(Boolean) });
      }
    } else if (suggestion.type === 'phrasing') {
      const textarea = contentRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const newContent = content.slice(0, start) + suggestion.text + content.slice(start);
        setContent(newContent);
        propagateChange({ content: newContent }, start + suggestion.text.length);
      }
    }
    // 'topic' suggestions are informational; no direct insertion
  };

  // ---- Save ----------------------------------------------------------------
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // For creates always start at version 1; for edits the transaction on the
      // server returns the real new version which we use for the snapshot below.
      const savedVersion = await onSave({
        userId,
        title,
        content,
        tags: tagList,
        parameters,
        visibility,
        price,
        version: prompt ? version + 1 : 1,
        collaborators: prompt?.collaborators ?? [],
      });

      // Save a version snapshot if editing an existing prompt.
      // Use the server-authoritative version returned by onSave so that the
      // snapshot label always matches the persisted document version.
      if (prompt?.id) {
        await saveVersion({
          promptId: prompt.id,
          title,
          content,
          tags: tagList,
          parameters,
          version: savedVersion ?? version + 1,
        });
      }

      // Sync local version state with whatever was actually persisted.
      if (savedVersion !== undefined) {
        setVersion(savedVersion);
      } else {
        setVersion((v) => v + 1);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const filteredSuggestions =
    suggestionFilter === 'all'
      ? suggestions
      : suggestions.filter((s) => s.type === suggestionFilter);

  const activeCollaborators = collaborators.filter((c) => c.userId !== userId);

  const panelTabClass = (panel: typeof activePanel) =>
    `px-3 py-2 text-sm rounded-lg transition-colors ${
      activePanel === panel
        ? 'bg-brand-purple/20 text-brand-purple'
        : 'text-gray-400 hover:text-white hover:bg-dark-700'
    }`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white">
          {prompt ? 'Edit Prompt' : 'Create New Prompt'}
          {prompt && (
            <span className="ml-2 text-xs text-gray-500">v{version}</span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-3 h-3 border border-brand-purple border-t-transparent rounded-full animate-spin inline-block" />
              Syncing…
            </span>
          )}
          {activeCollaborators.length > 0 && (
            <div className="flex -space-x-2">
              {activeCollaborators.slice(0, 4).map((c) => (
                c.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c.userId}
                    src={c.photoURL}
                    alt={c.displayName}
                    title={`${c.displayName} is editing`}
                    className="w-6 h-6 rounded-full border border-dark-800 object-cover"
                  />
                ) : (
                  <div
                    key={c.userId}
                    title={`${c.displayName} is editing`}
                    className="w-6 h-6 rounded-full border border-dark-800 bg-brand-purple/30 flex items-center justify-center text-xs text-brand-purple font-bold"
                  >
                    {c.displayName?.[0] ?? '?'}
                  </div>
                )
              ))}
              {activeCollaborators.length > 4 && (
                <div className="w-6 h-6 rounded-full border border-dark-800 bg-dark-700 flex items-center justify-center text-xs text-gray-400">
                  +{activeCollaborators.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Panel tabs ---- */}
      <div className="flex gap-1 px-6 pt-3">
        <button className={panelTabClass('editor')} onClick={() => setActivePanel('editor')}>
          ✏️ Editor
        </button>
        <button
          className={panelTabClass('suggestions')}
          onClick={() => { setActivePanel('suggestions'); }}
        >
          🤖 AI Suggestions
          {suggestions.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-brand-purple/30 text-brand-purple">
              {suggestions.length}
            </span>
          )}
        </button>
        {prompt?.id && (
          <button className={panelTabClass('versions')} onClick={handleShowVersions}>
            🕒 Version History
          </button>
        )}
        {prompt?.id && (
          <button
            className={panelTabClass('collab')}
            onClick={() => setActivePanel('collab')}
          >
            👥 Collaborators
            {activeCollaborators.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/30 text-cyan-400">
                {activeCollaborators.length}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="p-6">
        {/* ================================================================ */}
        {/* EDITOR PANEL                                                      */}
        {/* ================================================================ */}
        {activePanel === 'editor' && (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  propagateChange({ title: e.target.value });
                }}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-brand-purple/50 focus:outline-none transition-colors"
                placeholder="Prompt title…"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Content
                <span className="ml-2 text-xs text-gray-600">
                  Use {'{{parameter}}'} for dynamic variables
                </span>
              </label>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  propagateChange(
                    { content: e.target.value, parameters: extractParameters(e.target.value) },
                    e.target.selectionStart
                  );
                }}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-brand-purple/50 focus:outline-none transition-colors resize-none font-mono text-sm"
                placeholder="Your prompt content… Use {{variable}} for dynamic parameters."
                rows={8}
                required
              />
              {/* Character count */}
              <div className="mt-1 text-right text-xs text-gray-600">
                {content.length} characters
              </div>
            </div>

            {/* Detected parameters */}
            {parameters.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Detected Parameters
                </label>
                <div className="flex flex-wrap gap-2">
                  {parameters.map((param) => (
                    <Badge key={param} color="cyan">
                      {'{'}{'{'}
                      {param}
                      {'}'}{'}'}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  These placeholders will be filled in by users before running the prompt.
                </p>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Tags <span className="text-xs text-gray-600">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  propagateChange({
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  });
                }}
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white focus:border-brand-purple/50 focus:outline-none transition-colors"
                placeholder="ai, writing, creative…"
              />
            </div>

            {/* Visibility + Pricing row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Visibility */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Visibility</label>
                <div className="flex gap-3">
                  {(['public', 'unlisted', 'private'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setVisibility(v);
                        propagateChange({ visibility: v });
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        visibility === v
                          ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple'
                          : 'bg-dark-700 border-dark-600 text-gray-400 hover:text-white'
                      }`}
                    >
                      {v === 'public' ? '🌐 Public' : v === 'unlisted' ? '🔗 Unlisted' : '🔒 Private'}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {visibility === 'public'
                    ? 'Visible to everyone on PromptSphere.'
                    : visibility === 'unlisted'
                    ? 'Only accessible via direct link — not listed in search.'
                    : 'Only you can see this prompt.'}
                </p>
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Price (USD) <span className="text-xs text-gray-600">— 0 for free</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={(price / 100).toFixed(2)}
                    onChange={(e) => {
                      const usd = parseFloat(e.target.value) || 0;
                      const cents = Math.round(usd * 100);
                      setPrice(cents);
                      propagateChange({ price: cents });
                    }}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl pl-8 pr-4 py-3 text-white focus:border-brand-purple/50 focus:outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>
                {price > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Users will pay ${(price / 100).toFixed(2)} to access this prompt.
                  </p>
                )}
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-gradient px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving…' : prompt ? 'Save Changes' : 'Create Prompt'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 rounded-xl font-semibold bg-dark-700 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* AI SUGGESTIONS PANEL                                              */}
        {/* ================================================================ */}
        {activePanel === 'suggestions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                AI-powered suggestions based on your prompt content and tags.
              </p>
              <div className="flex gap-2">
                {(['all', 'keyword', 'phrasing', 'topic'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSuggestionFilter(f)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      suggestionFilter === f
                        ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple'
                        : 'border-dark-600 text-gray-500 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p className="text-3xl mb-2">🤖</p>
                <p>Start typing your prompt to see AI suggestions.</p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filteredSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-dark-700/60 border border-dark-600"
                  >
                    <span className="text-lg mt-0.5 shrink-0">
                      <SuggestionTypeIcon type={s.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.text}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{s.description}</p>
                    </div>
                    {(s.type === 'keyword' || s.type === 'phrasing') && (
                      <button
                        onClick={() => handleApplySuggestion(s)}
                        className="shrink-0 px-3 py-1 text-xs rounded-lg bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-dark-700">
              <button
                onClick={() => setActivePanel('editor')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Back to editor
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VERSION HISTORY PANEL                                             */}
        {/* ================================================================ */}
        {activePanel === 'versions' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Each saved change is stored as a version. Click <strong>Restore</strong> to revert to
              any previous version.
            </p>

            {loadingVersions ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p className="text-3xl mb-2">🕒</p>
                <p>No saved versions yet. Save the prompt to create the first snapshot.</p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-xl bg-dark-700/60 border border-dark-600"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        v{v.version} — {v.title || '(no title)'}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{v.content}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        {v.savedAt.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(v)}
                      className="shrink-0 px-3 py-1 text-xs rounded-lg bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 transition-colors"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-dark-700">
              <button
                onClick={() => setActivePanel('editor')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Back to editor
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* COLLABORATION PANEL                                               */}
        {/* ================================================================ */}
        {activePanel === 'collab' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Users currently editing this prompt in real time.
            </p>

            {collaborators.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p className="text-3xl mb-2">👥</p>
                <p>No other collaborators online right now.</p>
                <p className="text-xs mt-1">Share the prompt link to invite others.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {collaborators.map((c) => (
                  <li
                    key={c.userId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/60 border border-dark-600"
                  >
                    {c.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.photoURL}
                        alt={c.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-purple/30 flex items-center justify-center text-sm text-brand-purple font-bold">
                        {c.displayName?.[0] ?? '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {c.userId === userId ? `${c.displayName} (you)` : c.displayName}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Cursor at position {c.cursorPosition} ·{' '}
                        {c.lastSeen.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Online" />
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-dark-700">
              <button
                onClick={() => setActivePanel('editor')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Back to editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
