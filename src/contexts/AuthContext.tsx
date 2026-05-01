'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/lib/auth';
import { getUser } from '@/lib/firestore';

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
   */
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await getUser(firebaseUser.uid);
          setUserRole(profile?.role ?? 'user');
        } catch {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
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
