import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { AdminAuthGuard } from './auth/AdminAuthGuard';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { MotoristaGuard } from './auth/MotoristaGuard';
import { OficinaSessionGuard } from './auth/OficinaSessionGuard';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute';
import { OficinaProtectedRoute } from './oficina/OficinaProtectedRoute';
import { OficinaPublicOnlyRoute } from './oficina/OficinaPublicOnlyRoute';
import { OficinaSessionProvider } from './oficina/OficinaSessionProvider';
import { LoginPage } from './pages/LoginPage';
import { MotoristaLoginPage } from './pages/motorista/MotoristaLoginPage';
import { MotoristaPainelPage } from './pages/motorista/MotoristaPainelPage';
import { MotoristaPlaceholderPage } from './pages/MotoristaPlaceholderPage';
import { OficinaLoginPage } from './pages/oficina/OficinaLoginPage';
import { OficinaTerminalPage } from './pages/oficina/OficinaTerminalPage';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado na aplicação.'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[App][Fatal]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Erro na aplicação</p>
            <h1 className="mt-3 text-2xl font-semibold">A aplicação falhou ao carregar</h1>
            <p className="mt-3 text-sm text-slate-300">
              {this.state.message}
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Recarrega a página ou verifica as variáveis de ambiente do Supabase.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    <AppErrorBoundary>
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
                  <OficinaSessionGuard>
                    <OficinaTerminalPage />
                  </OficinaSessionGuard>
                )}
              />

              <Route
                path="/motorista/login"
                element={(
                  <PublicOnlyRoute>
                    <MotoristaLoginPage />
                  </PublicOnlyRoute>
                )}
              />

              <Route
                path="/motorista/painel"
                element={(
                  <MotoristaGuard>
                    <MotoristaPainelPage />
                  </MotoristaGuard>
                )}
              />

              <Route
                path="/motorista"
                element={<Navigate to="/motorista/painel" replace />}
              />

              <Route
                path="/"
                element={(
                  <AdminAuthGuard>
                    <DashboardContainer />
                  </AdminAuthGuard>
                )}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </OficinaSessionProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
};
