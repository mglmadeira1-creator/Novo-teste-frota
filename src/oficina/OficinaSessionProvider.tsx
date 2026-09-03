import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { oficinaTerminalService } from '../services/oficinaTerminalService';

const STORAGE_KEY = 'frota_pro_oficina_terminal_session';
const AUTO_LOCK_FLAG_KEY = 'frota_pro_oficina_auto_locked';
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

interface OficinaSessionPayload {
  token: string;
  expiresAt: string;
  mecanico: {
    id: string;
    nome: string;
  };
  terminal: {
    id: string;
    codigo: string;
    nome: string;
    oficinaNome?: string | null;
  };
}

interface OficinaSessionContextValue {
  loading: boolean;
  token: string | null;
  expiresAt: string | null;
  mecanico: OficinaSessionPayload['mecanico'] | null;
  terminal: OficinaSessionPayload['terminal'] | null;
  autoLocked: boolean;
  clearAutoLocked: () => void;
  login: (codigo: string, terminalCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const OficinaSessionContext = createContext<OficinaSessionContextValue | null>(null);

function readStorage(): OficinaSessionPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as OficinaSessionPayload;
  } catch {
    return null;
  }
}

function writeStorage(payload: OficinaSessionPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const OficinaSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [mecanico, setMecanico] = useState<OficinaSessionPayload['mecanico'] | null>(null);
  const [terminal, setTerminal] = useState<OficinaSessionPayload['terminal'] | null>(null);
  const [autoLocked, setAutoLocked] = useState(localStorage.getItem(AUTO_LOCK_FLAG_KEY) === '1');
  const timeoutRef = useRef<number | null>(null);

  const clearInactivityTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const hardResetSession = () => {
    setToken(null);
    setExpiresAt(null);
    setMecanico(null);
    setTerminal(null);
    clearStorage();
    clearInactivityTimer();
  };

  const logout = async () => {
    const currentToken = token;
    hardResetSession();

    if (currentToken) {
      try {
        await oficinaTerminalService.logout(currentToken);
      } catch (error) {
        console.error('[Oficina][Session] Falha a terminar sessao remota', error);
      }
    }
  };

  const resetInactivityTimer = () => {
    if (!token) {
      return;
    }

    clearInactivityTimer();
    timeoutRef.current = window.setTimeout(async () => {
      localStorage.setItem(AUTO_LOCK_FLAG_KEY, '1');
      setAutoLocked(true);
      await logout();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    const restore = async () => {
      const session = readStorage();
      if (!session?.token) {
        setLoading(false);
        return;
      }

      try {
        const result = await oficinaTerminalService.validateSession(session.token);
        setToken(session.token);
        setExpiresAt(session.expiresAt);
        setMecanico({ id: result.id, nome: result.nome });
        setTerminal(result.terminal);
      } catch (error) {
        console.warn('[Oficina][Session] Sessao local invalida, limpando...', error);
        clearStorage();
      } finally {
        setLoading(false);
      }
    };

    restore();

    return () => {
      clearInactivityTimer();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      clearInactivityTimer();
      return;
    }

    const handler = () => {
      resetInactivityTimer();
    };

    resetInactivityTimer();

    window.addEventListener('mousemove', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);

    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      clearInactivityTimer();
    };
  }, [token]);

  const login = async (codigo: string, terminalCode: string) => {
    const result = await oficinaTerminalService.login(codigo, terminalCode);

    const payload: OficinaSessionPayload = {
      token: result.token,
      expiresAt: result.expiresAt,
      mecanico: result.mecanico,
      terminal: result.terminal
    };

    writeStorage(payload);
    localStorage.removeItem(AUTO_LOCK_FLAG_KEY);
    setAutoLocked(false);

    setToken(result.token);
    setExpiresAt(result.expiresAt);
    setMecanico(result.mecanico);
    setTerminal(result.terminal);
    resetInactivityTimer();
  };

  const clearAutoLocked = () => {
    localStorage.removeItem(AUTO_LOCK_FLAG_KEY);
    setAutoLocked(false);
  };

  const value = useMemo<OficinaSessionContextValue>(() => ({
    loading,
    token,
    expiresAt,
    mecanico,
    terminal,
    autoLocked,
    clearAutoLocked,
    login,
    logout
  }), [loading, token, expiresAt, mecanico, terminal, autoLocked]);

  return <OficinaSessionContext.Provider value={value}>{children}</OficinaSessionContext.Provider>;
};

export function useOficinaSession(): OficinaSessionContextValue {
  const context = useContext(OficinaSessionContext);
  if (!context) {
    throw new Error('useOficinaSession deve ser usado dentro de OficinaSessionProvider.');
  }

  return context;
}
