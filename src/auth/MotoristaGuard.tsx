import React from 'react';
import { Navigate } from 'react-router-dom';
import { readMotoristaSession } from './motoristaSession';

export const MotoristaGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const motoristaSession = readMotoristaSession();

  if (!motoristaSession || !motoristaSession.token || (motoristaSession.expiresAt && Date.parse(motoristaSession.expiresAt) <= Date.now())) {
    return <Navigate to="/motorista/login" replace />;
  }

  return <>{children}</>;
};
