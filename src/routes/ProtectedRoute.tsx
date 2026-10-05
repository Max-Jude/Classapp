import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomeRouteForProfile } from '../services/authService';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, children }) => {
  const { loading, isAuthenticated, profile, isAdmin, isApproved } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-mono text-slate-500">AUTHENTICATING SESSION</p>
          <p className="text-sm font-medium text-slate-800">
            Verifying Firebase credentials &amp; admission permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Gate 1: Require Admin Approval before entering any workspace
  if (!isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Gate 2: Super-Admin can access Admin, Tutor, and Student views seamlessly
  if (isAdmin) {
    return <>{children}</>;
  }

  // Gate 3: Enforce role-based access control for non-admin users
  if (profile.role !== allowedRole) {
    return <Navigate to={getHomeRouteForProfile(profile)} replace />;
  }

  return <>{children}</>;
};
