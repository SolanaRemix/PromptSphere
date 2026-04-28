'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  subscribeToPrompt,
  subscribeToCollaborators,
  updateCollaboratorPresence,
  removeCollaboratorPresence,
  updatePrompt,
  savePromptVersion,
} from '@/lib/firestore';
import type { Prompt, CollaboratorPresence } from '@/types';

const PRESENCE_INTERVAL_MS = 15_000; // heartbeat every 15 s
const SAVE_DEBOUNCE_MS = 1_500;       // debounce saves by 1.5 s
const CURSOR_THROTTLE_MS = 2_000;     // throttle cursor-only presence writes to once per 2 s
/** Sentinel value used when editing a new (unsaved) prompt — disables all Firestore I/O. */
const NEW_PROMPT_SENTINEL = '__new__';

interface UseCollaborationOptions {
  promptId: string;
  userId: string;
  displayName: string;
  photoURL: string;
  /** Called whenever the remote prompt document changes. */
  onRemoteChange?: (prompt: Prompt) => void;
}

interface UseCollaborationReturn {
  collaborators: CollaboratorPresence[];
  isSaving: boolean;
  /** Call this whenever the local editor content changes. */
  handleLocalChange: (
    updates: Partial<Pick<Prompt, 'title' | 'content' | 'tags' | 'parameters' | 'visibility' | 'price'>>,
    currentVersion: number,
    cursorPosition?: number
  ) => void;
  /** Manually persist the current state and create a version snapshot. */
  saveVersion: (prompt: Partial<Prompt> & { promptId: string; title: string; content: string; tags: string[]; parameters: string[]; version: number }) => Promise<void>;
}

/**
 * Manages real-time collaboration for a single prompt using Firestore
 * `onSnapshot` listeners and debounced writes.
 *
 * Usage:
 * ```tsx
 * const { collaborators, handleLocalChange } = useCollaboration({ promptId, userId, ... });
 * ```
 */
export function useCollaboration({
  promptId,
  userId,
  displayName,
  photoURL,
  onRemoteChange,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCursorRef = useRef(0);
  const pendingUpdatesRef = useRef<Partial<Prompt> | null>(null);
  /** Timestamp (ms) of the last cursor-only presence write, used for throttling. */
  const lastCursorWriteRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Clear pending save timer whenever promptId changes to prevent a stale
  // timer from writing to the previous prompt after navigation.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      pendingUpdatesRef.current = null;
    };
  }, [promptId]);

  // ---------------------------------------------------------------------------
  // Subscribe to remote prompt changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!promptId || promptId === NEW_PROMPT_SENTINEL) return;
    const unsub = subscribeToPrompt(promptId, (prompt) => {
      if (prompt) onRemoteChange?.(prompt);
    });
    return unsub;
  }, [promptId, onRemoteChange]);

  // ---------------------------------------------------------------------------
  // Subscribe to collaborator presence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!promptId || promptId === NEW_PROMPT_SENTINEL) return;
    const unsub = subscribeToCollaborators(promptId, (list) => {
      // Filter out stale entries (not seen in the last 60 s)
      const cutoff = Date.now() - 60_000;
      setCollaborators(list.filter((c) => c.lastSeen.getTime() > cutoff));
    });
    return unsub;
  }, [promptId]);

  // ---------------------------------------------------------------------------
  // Presence heartbeat
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!promptId || promptId === NEW_PROMPT_SENTINEL || !userId) return;

    const sendPresence = () => {
      updateCollaboratorPresence(promptId, {
        userId,
        displayName,
        photoURL,
        cursorPosition: latestCursorRef.current,
        lastSeen: new Date(),
      }).catch((err) => console.warn('[useCollaboration] presence write failed:', err));
    };

    sendPresence();
    presenceTimerRef.current = setInterval(sendPresence, PRESENCE_INTERVAL_MS);

    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      removeCollaboratorPresence(promptId, userId).catch((err) =>
        console.warn('[useCollaboration] presence cleanup failed:', err)
      );
    };
  }, [promptId, userId, displayName, photoURL]);

  // ---------------------------------------------------------------------------
  // Debounced save
  // ---------------------------------------------------------------------------
  const flushSave = useCallback(async (updates: Partial<Prompt>) => {
    if (promptId === NEW_PROMPT_SENTINEL) return;
    setIsSaving(true);
    try {
      await updatePrompt(promptId, {
        ...updates,
        version: (updates.version ?? 1) + 1,
      });
    } catch (err) {
      console.error('[useCollaboration] save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [promptId]);

  const handleLocalChange = useCallback(
    (
      updates: Partial<Pick<Prompt, 'title' | 'content' | 'tags' | 'parameters' | 'visibility' | 'price'>>,
      currentVersion: number,
      cursorPosition = 0
    ) => {
      latestCursorRef.current = cursorPosition;
      pendingUpdatesRef.current = { ...updates, version: currentVersion };

      // Refresh cursor in presence — throttled to at most once per CURSOR_THROTTLE_MS
      // to avoid a Firestore write on every keystroke.
      if (promptId !== NEW_PROMPT_SENTINEL) {
        const now = Date.now();
        if (now - lastCursorWriteRef.current >= CURSOR_THROTTLE_MS) {
          lastCursorWriteRef.current = now;
          updateCollaboratorPresence(promptId, {
            userId,
            displayName,
            photoURL,
            cursorPosition,
            lastSeen: new Date(),
          }).catch((err) => console.warn('[useCollaboration] cursor update failed:', err));
        }
      }

      // Debounce the Firestore write
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (pendingUpdatesRef.current) {
          flushSave(pendingUpdatesRef.current);
          pendingUpdatesRef.current = null;
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [promptId, userId, displayName, photoURL, flushSave]
  );

  const saveVersion = useCallback(
    async (prompt: Partial<Prompt> & { promptId: string; title: string; content: string; tags: string[]; parameters: string[]; version: number }) => {
      await savePromptVersion(prompt.promptId, {
        promptId: prompt.promptId,
        userId,
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags,
        parameters: prompt.parameters,
        version: prompt.version,
      });
    },
    [userId]
  );

  return { collaborators, isSaving, handleLocalChange, saveVersion };
}
