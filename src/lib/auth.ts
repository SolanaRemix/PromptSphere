import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

/**
 * The email address granted admin privileges.
 * Set NEXT_PUBLIC_ADMIN_EMAIL in your environment to override.
 * For production, enforce admin access through Firestore security rules
 * and/or Firebase custom claims rather than relying solely on this value.
 */
export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'gxqstudio@gmail.com';

/**
 * A set of email addresses granted moderator privileges.
 * Moderators can review and remove spam listings but cannot access financial data.
 * Set NEXT_PUBLIC_MODERATOR_EMAILS as a comma-separated list to override.
 */
export const MODERATOR_EMAILS: Set<string> = new Set(
  (process.env.NEXT_PUBLIC_MODERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
);

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
