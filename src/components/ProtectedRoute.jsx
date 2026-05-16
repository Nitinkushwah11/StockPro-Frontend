import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { canAccess, canCallEndpoint, normalizeRole } from '../utils/permissions';

const ProtectedRoute = ({ allowedRoles, requiredPermission, anyPermissions, endpointMethod, endpointPath, deniedRedirectTo }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = normalizeRole(user.role);
  const hasFrontendAccess = canAccess(normalizedRole, {
    allowedRoles,
    permission: requiredPermission,
    anyPermissions
  });
  const hasBackendAccess = endpointMethod && endpointPath
    ? canCallEndpoint(normalizedRole, endpointMethod, endpointPath)
    : true;

  if (!hasFrontendAccess || !hasBackendAccess) {
    if (deniedRedirectTo) {
      return <Navigate to={deniedRedirectTo} replace />;
    }
    return <Navigate to="/access-denied" state={{ deniedFrom: location.pathname }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
