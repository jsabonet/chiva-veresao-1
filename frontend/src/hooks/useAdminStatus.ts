import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Key prefix for sessionStorage cache of admin status per user uid
const STORAGE_KEY_PREFIX = 'chiva:adminStatus:';

interface AdminStatus {
  isAdmin: boolean;
  isProtectedAdmin: boolean;
  canManageAdmins: boolean;
}

export function useAdminStatus() {
  const { currentUser } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isProtectedAdmin: false,
    canManageAdmins: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setAdminStatus({ isAdmin: false, isProtectedAdmin: false, canManageAdmins: false });
        setLoading(false);
        return;
      }

      // Instant email-based check from environment (mirror of backend FIREBASE_ADMIN_EMAILS)
      try {
        const raw = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_FIREBASE_ADMIN_EMAILS;
        if (raw) {
          const list = String(raw).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          const email = (currentUser as any).email || '';
          if (email && list.includes(email.toLowerCase())) {
            const envAdmin: AdminStatus = { isAdmin: true, isProtectedAdmin: true, canManageAdmins: true };
            console.debug('[useAdminStatus] Instant admin from VITE_FIREBASE_ADMIN_EMAILS for', email);
            setAdminStatus(envAdmin);
            try {
              const uid = (currentUser as any).uid;
              if (uid) sessionStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(envAdmin));
            } catch (e) {}
            // still fallthrough to verify with backend
          }
        }
      } catch (e) {
        // ignore
      }

      // Try to read cached status for this user to display instantly
      try {
        const uid = (currentUser as any).uid;
        if (uid) {
          const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + uid);
          if (raw) {
            try {
              const cached = JSON.parse(raw) as AdminStatus;
              // Apply cached value immediately (optimistic, will be overwritten by server)
              setAdminStatus(cached);
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        // ignore storage access errors
      }

      // Optimistic check: if Firebase token contains custom claim 'admin', show instantly
      try {
        const tokenResult: any = await (currentUser as any).getIdTokenResult?.();
        if (tokenResult && tokenResult.claims && tokenResult.claims.admin) {
          const optimistic: AdminStatus = {
            isAdmin: true,
            isProtectedAdmin: !!tokenResult.claims.protected_admin,
            canManageAdmins: true,
          };
          setAdminStatus(optimistic);
          // store optimistic in session so future renders are instant
          try {
            const uid = (currentUser as any).uid;
            if (uid) sessionStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(optimistic));
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore token claim read errors
      }

      // Retry logic: sometimes the Firebase token is not yet ready on first request
      // (race between auth state and token refresh). Try a few times with backoff
      // before giving up. Only retry on auth-related failures (HTTP 401) or
      // transient network errors.
      const maxAttempts = 3;
      let attempt = 0;
      let lastErr: any = null;
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          console.debug('[useAdminStatus] Checking status for user:', currentUser.email, 'attempt', attempt);
          const response = await apiClient.get<AdminStatus>('/admin/check-status/');
          console.debug('[useAdminStatus] /admin/check-status response:', response);
          setAdminStatus(response);
          // Persist authoritative status in sessionStorage for instant future renders
          try {
            const uid = (currentUser as any).uid;
            if (uid) sessionStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(response));
          } catch (e) {
            // ignore storage failures
          }
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          console.warn('[useAdminStatus] attempt', attempt, 'failed:', msg);
          // If unauthorized, wait and retry (maybe token not ready). If other error
          // (500, 404, etc.) don't retry more than once.
          const isAuthError = msg.includes('status: 401') || msg.toLowerCase().includes('não autenticado') || msg.toLowerCase().includes('unauthorized');
          if (!isAuthError) break;

          // Small backoff before retrying
          await new Promise((res) => setTimeout(res, 500 * attempt));
        }
      }

      if (lastErr) {
        console.error('Erro ao verificar status de admin após tentativas:', lastErr);
        setError('Erro ao verificar permissões de administrador');
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [currentUser]);

  return { ...adminStatus, loading, error };
}