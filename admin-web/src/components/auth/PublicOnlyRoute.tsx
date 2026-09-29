import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function PublicOnlyRoute({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={from} replace />;
  }
  return children;
}

