import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Actor } from '@/lib/reservations';
import type { UserRole } from '@/types/reservation';

type UserProfile = { displayName: string; username: string; role: UserRole };

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  /** Usuario actual para registrar quién crea o edita reservas. */
  actor: Actor | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (u) {
        const fallbackName = u.displayName || u.email?.split('@')[0] || 'Usuario';
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          const data = snap.exists() ? snap.data() : {};
          setUserProfile({
            displayName: data.displayName || fallbackName,
            username: data.username || u.email?.split('@')[0] || '',
            // Sin rol asignado se trata como empleado (no puede eliminar).
            role: data.role === 'admin' ? 'admin' : 'empleado',
          });
        } catch {
          setUserProfile({ displayName: fallbackName, username: '', role: 'empleado' });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      userProfile,
      actor: user && userProfile ? { uid: user.uid, name: userProfile.displayName } : null,
      isAdmin: userProfile?.role === 'admin',
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, userProfile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
