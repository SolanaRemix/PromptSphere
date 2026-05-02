'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/auth';
import { getUser } from '@/lib/firestore';
import type { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Role is fetched from the Firestore `users/{uid}` document so the
   * client-side `isModerator` flag stays in sync with Firestore security
   * rules (which check `users/{uid}.role == "moderator"`).
   * Typed as `User['role']` (closed set) rather than `string` for type safety.
   */
  const [userRole, setUserRole] = useState<User['role'] | null>(null);

  useEffect(() => {
    let isMounted = true;
    /**
     * Tracks the uid of the most-recent auth-state change.  If auth flips
     * (e.g. sign-out then sign-in) while a getUser fetch is in-flight, the
     * stale response is discarded by comparing against `latestUid`.
     */
    let latestUid: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid ?? null;
      latestUid = uid;

      if (!isMounted) return;
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUser(firebaseUser.uid);
        // Discard results if the component unmounted or auth changed again.
        if (isMounted && latestUid === uid) {
          // profile.role is already validated as User['role'] by the type
          // returned from getUser; fall back to 'user' for missing profiles.
          setUserRole(profile?.role ?? 'user');
          setLoading(false);
        }
      } catch {
        if (isMounted && latestUid === uid) {
          setUserRole('user');
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;
  // isModerator is derived from the Firestore role field to match the
  // server-enforced Firestore security rules. Admins implicitly have
  // all moderator capabilities too.
  const isModerator = isAdmin || userRole === 'moderator';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isModerator }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
