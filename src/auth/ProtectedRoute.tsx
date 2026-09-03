import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const Spinner: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-slate-400">A validar sessão...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, role, signOut } = useAuth();
  const signOutTriggeredRef = useRef(false);

  // A session without a recognised role must never bounce between "/" and "/login".
  const hasInvalidRole = Boolean(session) && role !== 'administrador' && role !== 'gestor' && role !== 'motorista';

  useEffect(() => {
    if (hasInvalidRole && !signOutTriggeredRef.current) {
      signOutTriggeredRef.current = true;
      signOut().finally(() => {
        signOutTriggeredRef.current = false;
      });
    }
  }, [hasInvalidRole, signOut]);

  if (loading || hasInvalidRole) {
    return <Spinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'motorista') {
    return <Navigate to="/motorista" replace />;
  }

  return <>{children}</>;
};
