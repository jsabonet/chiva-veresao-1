import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute: allow only users that the backend confirms as admins.
 * Uses useAdminStatus() which performs an authoritative check against
 * the backend (/admin/check-status/) and caches results.
 * If the user isn't admin, redirect to shop home ('/').
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  // While auth or admin status is loading, show spinner
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated -> send to login
  if (!currentUser) return <Navigate to="/login" />;

  // Authenticated but not an admin -> eject to storefront (do not allow staying on admin UI)
  if (!isAdmin) return <Navigate to="/" replace />;

  // Authorized admin -> render children
  return <>{children}</>;
};

export default AdminRoute;
