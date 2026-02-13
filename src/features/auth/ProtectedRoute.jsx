import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../core/context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], requiresPermission = null }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission-based access (optional)
  if (requiresPermission && typeof requiresPermission === 'function') {
    if (!requiresPermission()) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;