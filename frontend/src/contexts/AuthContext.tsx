import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiClient } from '@/lib/api';
import { sendPasswordResetEmail } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    // Clear cached admin status for this user to avoid stale UI for next login
    try {
      const user = auth.currentUser as any;
      if (user && user.uid) {
        try { sessionStorage.removeItem('chiva:adminStatus:' + user.uid); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
    await firebaseSignOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Prefer popup; fallback to redirect for environments blocking popups
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      // If popup blocked or unsupported, try redirect
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    // Using default action URL configured in Firebase console.
    await sendPasswordResetEmail(auth, email);
  };

  // Handle redirect result (if user came back from redirect flow)
  useEffect(() => {
    getRedirectResult(auth).catch(() => {/* ignore */});
  }, []);

  useEffect(() => {
    const STORAGE_KEY_PREFIX = 'chiva:adminStatus:';

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);

      // When a user signs in, write an optimistic admin status into sessionStorage
      // so components that read the cache (useAdminStatus) can show admin UI instantly.
      (async () => {
        try {
          if (!user) {
            // clear any leftover cache
            try { sessionStorage.removeItem(STORAGE_KEY_PREFIX + (user as any)?.uid); } catch (e) {}
            return;
          }

          const uid = (user as any).uid;
          const email = (user as any).email || '';

          // 1) Instant env-based admin detection
          let optimistic = { isAdmin: false, isProtectedAdmin: false, canManageAdmins: false };
          try {
            const raw = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_FIREBASE_ADMIN_EMAILS;
            if (raw) {
              const list = String(raw).split(',').map((s:string) => s.trim().toLowerCase()).filter(Boolean);
              if (email && list.includes(email.toLowerCase())) {
                optimistic = { isAdmin: true, isProtectedAdmin: true, canManageAdmins: true };
              }
            }
          } catch (e) {}

          // 2) If token has admin claim, set optimistic
          try {
            const tokenResult: any = await (user as any).getIdTokenResult?.();
            if (tokenResult && tokenResult.claims && tokenResult.claims.admin) {
              optimistic = { isAdmin: true, isProtectedAdmin: !!tokenResult.claims.protected_admin, canManageAdmins: true };
            }
          } catch (e) {
            // ignore
          }

          // Store optimistic result so useAdminStatus can pick it up instantly
          try {
            if (uid) sessionStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(optimistic));
          } catch (e) {}

          // Fire-and-forget authoritative check to backend to update cache
          (async () => {
            try {
              const resp = await apiClient.get('/admin/check-status/');
              try {
                if (uid) sessionStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(resp));
              } catch (e) {}
            } catch (e) {
              // ignore
            }
          })();
        } catch (e) {
          // ignore
        }
      })();
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle
    ,resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
