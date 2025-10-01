import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// In this project, we use Firebase for auth; staff check is delegated to backend.
// For now, allow any authenticated user to access admin UI; backend endpoints enforce is_staff.
// If you later mirror is_staff via custom claims, you can gate here.

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // TODO: enhance with Firebase custom claims (is_staff) if available
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};

export default AdminRoute;
