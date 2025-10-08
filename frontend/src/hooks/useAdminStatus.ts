import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface AdminStatus {
  isAdmin: boolean;
  isProtectedAdmin: boolean;
  canManageAdmins: boolean;
}

export function useAdminStatus() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isProtectedAdmin: false,
    canManageAdmins: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await apiClient.get<AdminStatus>('/admin/check-status/');
        console.debug('[useAdminStatus] /admin/check-status response:', response);
        setAdminStatus(response);
      } catch (err) {
        console.error('Erro ao verificar status de admin:', err);
        setError('Erro ao verificar permissões de administrador');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { ...adminStatus, loading, error };
}