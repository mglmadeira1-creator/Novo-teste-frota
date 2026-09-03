import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const Spinner: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-slate-400">A validar sessão do motorista...</p>
    </div>
  </div>
);

export const MotoristaGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, role } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!session) {
    return <Navigate to="/motorista/login" replace />;
  }

  if (role !== 'motorista') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
