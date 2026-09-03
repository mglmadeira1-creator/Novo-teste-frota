import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';
import { AppRole, AuthRoleInfo } from '../types/auth';

interface AuthContextValue extends AuthRoleInfo {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signingOut: boolean;
  userName: string;
  userEmail: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'administrador' || normalized === 'admin' || normalized === 'administrator') {
    return 'administrador';
  }

  if (normalized === 'gestor' || normalized === 'manager') {
    return 'gestor';
  }

  if (normalized === 'motorista' || normalized === 'driver') {
    return 'motorista';
  }

  return null;
}

function resolveRole(user: User | null): AppRole | null {
  if (!user) {
    return null;
  }

  const appMetadata = user.app_metadata || {};
  const userMetadata = user.user_metadata || {};

  const explicitRole = normalizeRole(appMetadata.role) || normalizeRole(userMetadata.role);
  if (explicitRole) {
    return explicitRole;
  }

  // Contas antigas sem `role` configurado no Supabase mantêm acesso total (migração incremental).
  const hasAnyRoleField = 'role' in appMetadata || 'role' in userMetadata;
  return hasAnyRoleField ? null : 'administrador';
}

function resolveUserName(user: User | null): string {
  if (!user) {
    return 'Utilizador';
  }

  const metadata = user.user_metadata || {};
  const possibleNames = [metadata.full_name, metadata.name, metadata.nome];

  for (const value of possibleNames) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (user.email && user.email.includes('@')) {
    return user.email.split('@')[0];
  }

  return 'Utilizador';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('[Auth][Session] Falha ao obter sessão', {
            message: error.message,
            status: error.status,
            code: (error as any).code
          });
        }

        setSession(data.session || null);
        setUser(data.session?.user || null);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) {
          return;
        }

        console.error('[Auth][Session] Erro inesperado ao inicializar sessão', {
          message: err?.message,
          name: err?.name
        });
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const role = resolveRole(user);
  const userName = resolveUserName(user);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    loading,
    signingOut,
    role,
    isAdministrador: role === 'administrador',
    isGestor: role === 'gestor',
    isMotorista: role === 'motorista',
    userName,
    userEmail: user?.email || 'Sem email',
    signOut: async () => {
      setSigningOut(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[Auth][SignOut] Falha ao terminar sessão remotamente', error);
        }
      } catch (err) {
        console.error('[Auth][SignOut] Erro inesperado ao terminar sessão', err);
      } finally {
        // Always clear local state, even if the remote call failed (expired/invalid token, offline, etc.).
        setSession(null);
        setUser(null);
        setSigningOut(false);
      }
    }
  }), [session, user, loading, signingOut, role, userName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
