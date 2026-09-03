import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOficinaSession } from './OficinaSessionProvider';

export const OficinaProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, token } = useOficinaSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">A validar sessao do terminal...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/oficina/login" replace />;
  }

  return <>{children}</>;
};
