import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccess, landingRouteFor } from '../lib/accessControl';
 
/**
 * Two jobs, chosen by whether `routeKey` is given:
 *
 *   no routeKey  — "must be signed in", nothing more.
 *   routeKey     — "must be signed in AND hold a role that can open this
 *                  screen", per lib/accessControl.js.
 *
 * The previous version took `allowedRoles` and treated an empty array as
 * "everyone", which is what every admin route passed — so role checks were
 * silently absent. Naming the screen instead of listing roles at the call site
 * means the list lives in one place and cannot drift per route.
 */
export default function ProtectedRoute({ routeKey }) {
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

  const role = user.profile?.role;

  if (routeKey && !canAccess(routeKey, role)) {
    return <Navigate to={landingRouteFor(role)} replace />;
  }

  return <Outlet />;
}