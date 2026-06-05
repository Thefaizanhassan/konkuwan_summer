import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const userRole = user.profile?.role;
  const hasPermission = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasPermission) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

/* initial code
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest mx-auto"></div>
          <p className="mt-4 text-forest font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const userRole = user.profile?.role; // Supabase profile
  const hasPermission = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasPermission) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
*/