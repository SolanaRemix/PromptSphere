import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Returns the value of a required Firebase environment variable.
 * Throws a clear, actionable error in the browser so misconfigured deployments
 * are obvious immediately. During server-side build/prerender the check is
 * skipped (Firebase is not used server-side in this app).
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if ((!value || value.trim() === '') && typeof window !== 'undefined') {
    throw new Error(
      `Missing required Firebase environment variable: ${name}. ` +
        'Set all NEXT_PUBLIC_FIREBASE_* values in your .env.local file before starting the app.'
    );
  }
  return value ?? '';
}

const firebaseConfig = {
  apiKey: getRequiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getRequiredEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

// Defer Firebase initialization to the browser only.
// Server-side prerendering does not use Firebase auth or Firestore.
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

// Exported as getter functions so callers can type-assert the non-null value;
// these must only be called from 'use client' code (hooks, event handlers, effects).
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getFirebaseApp());
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore(getFirebaseApp());
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
