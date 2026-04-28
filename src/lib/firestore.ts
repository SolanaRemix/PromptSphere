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

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as User;
}

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

export async function deletePrompt(promptId: string) {
  await deleteDoc(doc(db, 'prompts', promptId));
}

// Roles
export async function getRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
}

// Activity Logs
export async function logActivity(data: Omit<ActivityLog, 'id'>) {
  await addDoc(collection(db, 'activityLogs'), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

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
