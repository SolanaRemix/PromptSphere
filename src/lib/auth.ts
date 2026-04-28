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

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
