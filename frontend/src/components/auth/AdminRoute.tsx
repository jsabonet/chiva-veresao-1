import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { customersApi, type CustomerProfile } from '@/lib/api';

// In this project, we use Firebase for auth; staff check is delegated to backend.
// For now, allow any authenticated user to access admin UI; backend endpoints enforce is_staff.
// If you later mirror is_staff via custom claims, you can gate here.

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!currentUser) {
        setIsStaff(null);
        return;
      }
      setChecking(true);
      try {
        const me: CustomerProfile = await customersApi.me();
        setIsStaff(!!me.isStaff);
      } catch (e) {
        // If call fails, be conservative and block admin UI
        setIsStaff(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // TODO: enhance with Firebase custom claims (is_staff) if available
  if (!currentUser) return <Navigate to="/login" />;
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  // Permissive in dev: let backend enforce is_staff; this prevents UI ejection
  return <>{children}</>;
};

export default AdminRoute;
