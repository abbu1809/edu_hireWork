import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { homePathForRole } from "@/shared/utils/format";
import LoadingState from "./LoadingState";

/**
 * Role guard for the portals. It only controls navigation: the API checks the
 * role again on every request, and Supabase RLS checks every row.
 */
export function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser, role, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return <LoadingState label="Verifying secure session..." />;

  if (!currentUser) {
    return <Navigate to="/auth?mode=login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return children || <Outlet />;
}

/** Sends signed-in users away from the login / sign-up screens. */
export function PublicOnlyRoute({ children }) {
  const { currentUser, role, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return <LoadingState label="Checking authorization..." />;

  if (currentUser) {
    return <Navigate to={location.state?.from || homePathForRole(role)} replace />;
  }

  return children || <Outlet />;
}
