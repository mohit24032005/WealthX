import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./common/StateViews";

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Verifying administrative privileges..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
