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
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, Prompt, Role, ActivityLog } from '@/types';

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
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
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt;
  });
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
