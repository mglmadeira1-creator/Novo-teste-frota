export interface MotoristaSessionData {
  token: string;
  expiresAt: string;
  numeroCartao: string;
  motoristaId?: string | null;
  motoristaNome?: string | null;
  qrTokenId?: string | null;
  estado?: string | null;
  loggedAt: string;
}

export const MOTORISTA_SESSION_KEY = 'frota_pro_motorista_session';

export function readMotoristaSession(): MotoristaSessionData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MOTORISTA_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MotoristaSessionData>;
    if (!parsed?.numeroCartao || !parsed?.token || !parsed?.expiresAt) {
      return null;
    }

    return {
      token: parsed.token || '',
      expiresAt: parsed.expiresAt || '',
      numeroCartao: parsed.numeroCartao,
      motoristaId: parsed.motoristaId || null,
      motoristaNome: parsed.motoristaNome || null,
      qrTokenId: parsed.qrTokenId || null,
      estado: parsed.estado || 'ativo',
      loggedAt: parsed.loggedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function writeMotoristaSession(session: MotoristaSessionData): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MOTORISTA_SESSION_KEY, JSON.stringify(session));
}

export function clearMotoristaSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(MOTORISTA_SESSION_KEY);
}