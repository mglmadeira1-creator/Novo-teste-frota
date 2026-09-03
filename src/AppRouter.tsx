import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute';
import { OficinaProtectedRoute } from './oficina/OficinaProtectedRoute';
import { OficinaPublicOnlyRoute } from './oficina/OficinaPublicOnlyRoute';
import { OficinaSessionProvider } from './oficina/OficinaSessionProvider';
import { LoginPage } from './pages/LoginPage';
import { MotoristaPlaceholderPage } from './pages/MotoristaPlaceholderPage';
import { OficinaLoginPage } from './pages/oficina/OficinaLoginPage';
import { OficinaTerminalPage } from './pages/oficina/OficinaTerminalPage';

const DashboardContainer: React.FC = () => {
  const { userName, userEmail, role, signOut, signingOut } = useAuth();

  return (
    <App
      userName={userName}
      userEmail={userEmail}
      userRole={role}
      onLogout={signOut}
      isLoggingOut={signingOut}
    />
  );
};

const MotoristaRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, session, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">A validar sessão...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'motorista') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <OficinaSessionProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={(
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              )}
            />

            <Route
              path="/oficina/login"
              element={(
                <OficinaPublicOnlyRoute>
                  <OficinaLoginPage />
                </OficinaPublicOnlyRoute>
              )}
            />

            <Route
              path="/oficina/terminal"
              element={(
                <OficinaProtectedRoute>
                  <OficinaTerminalPage />
                </OficinaProtectedRoute>
              )}
            />

            <Route
              path="/motorista"
              element={(
                <MotoristaRoute>
                  <MotoristaPlaceholderPage />
                </MotoristaRoute>
              )}
            />

            <Route
              path="/"
              element={(
                <ProtectedRoute>
                  <DashboardContainer />
                </ProtectedRoute>
              )}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </OficinaSessionProvider>
    </BrowserRouter>
  );
};
