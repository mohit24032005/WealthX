import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./common/StateViews";

export const ProtectedRoute = ({ children, requireOnboarded = false }) => {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Authenticating session..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is not onboarded and tries to access dashboard/other protected pages, redirect to onboarding
  if (requireOnboarded && !isOnboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If already onboarded and trying to access onboarding, redirect to dashboard
  if (location.pathname === "/onboarding" && isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isOnboarded, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Loading..." fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to={isOnboarded ? "/dashboard" : "/onboarding"} replace />;
  }

  return children;
};

export default ProtectedRoute;
