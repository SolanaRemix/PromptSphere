import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, Prompt, PromptVersion, CollaboratorPresence, Role, ActivityLog } from '@/types';

// Users
export async function createUser(userData: Omit<User, 'createdAt'>) {
  await setDoc(doc(db, 'users', userData.uid), {
    ...userData,
    createdAt: serverTimestamp(),
  });
}

/**
 * Atomically upserts a user profile document.
 * Uses `merge: true` so a simultaneous sign-in from multiple devices cannot
 * create duplicate documents or overwrite fields that already exist.
 * `createdAt` is only written on the initial create; subsequent merges leave
 * it unchanged because Firestore ignores missing keys in a merge write.
 */
export async function upsertUser(userData: Omit<User, 'createdAt'>) {
  const ref = doc(db, 'users', userData.uid);
  // Persist createdAt only if the document is being created for the first time.
  // Using setDoc with merge:true means existing fields are not overwritten.
  await setDoc(
    ref,
    {
      ...userData,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as User;
}

/**
 * Returns all user documents.
 *
 * ⚠️  SECURITY: This function reads the entire `users` collection from the
 * browser client.  It MUST be protected by a Firestore security rule that
 * restricts reads to authenticated admins, e.g.:
 *
 *   match /users/{uid} {
 *     allow list: if request.auth.token.email == '<ADMIN_EMAIL>';
 *   }
 *
 * For stronger enforcement, move this call behind a Next.js Route Handler or
 * Firebase Callable Function that verifies a Firebase Admin SDK custom claim.
 */
export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as User;
  });
}

// Prompts
export async function createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'prompts'), {
    ...promptData,
    parameters: promptData.parameters ?? [],
    visibility: promptData.visibility ?? 'private',
    price: promptData.price ?? 0,
    version: promptData.version ?? 1,
    collaborators: promptData.collaborators ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPromptById(promptId: string): Promise<Prompt | null> {
  const snap = await getDoc(doc(db, 'prompts', promptId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    parameters: data.parameters ?? [],
    visibility: data.visibility ?? 'private',
    price: data.price ?? 0,
    version: data.version ?? 1,
    collaborators: data.collaborators ?? [],
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
  } as Prompt;
}

/**
 * Updates a prompt document using a transaction to prevent lost updates from
 * concurrent editors. The version is atomically incremented from the current
 * stored value, so all concurrent saves are recorded in sequence rather than
 * silently overwriting each other.
 *
 * Returns the new version number as committed by the transaction, which callers
 * should use (e.g. to label a version-history snapshot) so that the stored
 * document version and the snapshot version are always in sync.
 *
 * Only the owner may update their own prompt (enforced by Firestore security rules).
 */
export async function updatePrompt(
  promptId: string,
  updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'version'>>
): Promise<number> {
  const promptRef = doc(db, 'prompts', promptId);
  let newVersion = 0;
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(promptRef);
    if (!snap.exists()) throw new Error('Prompt not found.');
    const storedVersion: number = snap.data().version ?? 0;
    // Always derive the next version from the current stored value so that two
    // clients starting from the same base do not both write the same version number.
    newVersion = storedVersion + 1;
    transaction.update(promptRef, {
      ...updates,
      version: newVersion,
      updatedAt: serverTimestamp(),
    });
  });
  return newVersion;
}

export async function getUserPrompts(userId: string): Promise<Prompt[]> {
  const q = query(
    collection(db, 'prompts'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'private',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt;
  });
}

/**
 * Returns all public prompts ordered by creation date (newest first).
 * Used for trending analysis and discovery.
 */
export async function getPublicPrompts(maxResults = 50): Promise<Prompt[]> {
  const q = query(
    collection(db, 'prompts'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'public',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt;
  });
}

/**
 * Subscribes to real-time updates for a single prompt.
 * Returns an unsubscribe function to cancel the listener.
 */
export function subscribeToPrompt(
  promptId: string,
  callback: (prompt: Prompt | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'prompts', promptId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      id: snap.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'private',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt);
  });
}

// Version History

/**
 * Saves a snapshot of the current prompt state as a version entry.
 */
export async function savePromptVersion(
  promptId: string,
  versionData: Omit<PromptVersion, 'id' | 'savedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'prompts', promptId, 'versions'), {
    ...versionData,
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Returns all saved versions for a prompt, newest first.
 */
export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const q = query(
    collection(db, 'prompts', promptId, 'versions'),
    orderBy('version', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      savedAt: (data.savedAt as Timestamp)?.toDate() ?? new Date(),
    } as PromptVersion;
  });
}

// Collaboration Presence

/**
 * Writes (or refreshes) a collaborator's presence record for a prompt.
 * Call periodically or on cursor movement to keep the entry fresh.
 */
export async function updateCollaboratorPresence(
  promptId: string,
  presence: CollaboratorPresence
): Promise<void> {
  await setDoc(
    doc(db, 'collaborationSessions', promptId, 'presence', presence.userId),
    {
      ...presence,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Removes a collaborator's presence record when they leave.
 */
export async function removeCollaboratorPresence(
  promptId: string,
  userId: string
): Promise<void> {
  await deleteDoc(doc(db, 'collaborationSessions', promptId, 'presence', userId));
}

/**
 * Subscribes to the live presence list for a prompt.
 * Returns an unsubscribe function.
 */
export function subscribeToCollaborators(
  promptId: string,
  callback: (collaborators: CollaboratorPresence[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'collaborationSessions', promptId, 'presence'),
    (snap) => {
      const collaborators = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          lastSeen: (data.lastSeen as Timestamp)?.toDate() ?? new Date(),
        } as CollaboratorPresence;
      });
      callback(collaborators);
    }
  );
}

/**
 * Deletes a prompt document owned by `userId`.
 *
 * The `userId` parameter is used for a client-side ownership guard; the
 * definitive enforcement MUST be in Firestore security rules:
 *
 *   match /prompts/{promptId} {
 *     allow delete: if request.auth.uid == resource.data.userId;
 *   }
 */
export async function deletePrompt(promptId: string, userId: string) {
  const promptRef = doc(db, 'prompts', promptId);
  const snap = await getDoc(promptRef);
  if (!snap.exists() || snap.data().userId !== userId) {
    throw new Error('Permission denied: you do not own this prompt.');
  }
  await deleteDoc(promptRef);
}

// Roles
export async function getRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
}

// Activity Logs
/**
 * `timestamp` is always set by the server; callers must not supply it.
 */
export async function logActivity(data: Omit<ActivityLog, 'id' | 'timestamp'>) {
  await addDoc(collection(db, 'activityLogs'), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

/**
 * Returns recent activity log entries.
 *
 * ⚠️  SECURITY: This function reads the `activityLogs` collection from the
 * browser client.  It MUST be protected by a Firestore security rule that
 * restricts reads to authenticated admins, e.g.:
 *
 *   match /activityLogs/{logId} {
 *     allow read: if request.auth.token.email == '<ADMIN_EMAIL>';
 *   }
 *
 * For stronger enforcement, move this call behind a Next.js Route Handler or
 * Firebase Callable Function that verifies a Firebase Admin SDK custom claim.
 */
export async function getActivityLogs(): Promise<ActivityLog[]> {
  const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: (data.timestamp as Timestamp)?.toDate() ?? new Date(),
    } as ActivityLog;
  });
}
