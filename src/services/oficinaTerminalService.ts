import { supabase } from '../api/supabaseClient';
import {
  CartaoResolveResult,
  OficinaAbastecimentoConfirmado,
  OficinaLoginResult,
  OficinaMotoristaQrResult,
  OficinaOperacaoRecente,
  OficinaViaturaItem
} from '../types/oficina';

interface InvokeResponse<T> {
  data: T | null;
  error: Error | null;
}

function normalizeError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(fallback);
}

async function extractFunctionErrorBody(error: unknown): Promise<Record<string, unknown> | null> {
  const context = (error as { context?: Response } | null)?.context;
  if (!context || typeof context.json !== 'function') {
    return null;
  }

  try {
    return await context.json();
  } catch {
    return null;
  }
}

async function invokeOficinaTerminal<T>(payload: Record<string, unknown>, sessionToken?: string): Promise<T> {
  const response = await supabase.functions.invoke('oficina-terminal', {
    body: payload,
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
  }) as InvokeResponse<T>;

  if (response.error) {
    throw normalizeError(response.error, 'Falha na funcao oficina-terminal.');
  }

  if (!response.data) {
    throw new Error('Resposta vazia da oficina-terminal.');
  }

  return response.data;
}

async function invokeOficinaAuth<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await supabase.functions.invoke('oficina-auth', {
    body: payload
  }) as InvokeResponse<T>;

  if (response.error) {
    throw normalizeError(response.error, 'Falha na funcao oficina-auth.');
  }

  if (!response.data) {
    throw new Error('Resposta vazia da oficina-auth.');
  }

  return response.data;
}

export const oficinaTerminalService = {
  async login(codigo: string, terminalCode: string): Promise<OficinaLoginResult> {
    return await invokeOficinaAuth<OficinaLoginResult>({
      action: 'login',
      codigo,
      terminalCode
    });
  },

  async validateSession(sessionToken: string): Promise<OficinaLoginResult['mecanico'] & { terminal: OficinaLoginResult['terminal'] }> {
    const result = await invokeOficinaTerminal<{
      ok: boolean;
      mecanico: OficinaLoginResult['mecanico'];
      terminal: OficinaLoginResult['terminal'];
    }>({
      action: 'validate_session'
    }, sessionToken);

    return {
      ...result.mecanico,
      terminal: result.terminal
    };
  },

  async logout(sessionToken: string): Promise<void> {
    await invokeOficinaTerminal<{ ok: boolean }>({ action: 'logout' }, sessionToken);
  },

  async listViaturas(sessionToken: string, motoristaId?: string): Promise<OficinaViaturaItem[]> {
    const result = await invokeOficinaTerminal<{ items: OficinaViaturaItem[] }>({
      action: 'list_viaturas',
      motoristaId
    }, sessionToken);

    return result.items || [];
  },

  async resolveMotoristaQr(sessionToken: string, qrCode: string): Promise<OficinaMotoristaQrResult> {
    return await invokeOficinaTerminal<OficinaMotoristaQrResult>({
      action: 'resolve_motorista_qr',
      qrCode
    }, sessionToken);
  },

  async resolveCartao(sessionToken: string, input: { numeroCartao?: string; qrCode?: string }): Promise<CartaoResolveResult> {
    try {
      return await invokeOficinaTerminal<CartaoResolveResult>({
        action: 'resolve_cartao',
        ...input
      }, sessionToken);
    } catch (err) {
      const body = await extractFunctionErrorBody(err);
      if (body && body.cartao && body.motorista) {
        const blockedError = new Error(typeof body.error === 'string' ? body.error : 'Cartao nao autorizado para abastecimento.');
        (blockedError as Error & { cartaoResult?: CartaoResolveResult }).cartaoResult = body as unknown as CartaoResolveResult;
        throw blockedError;
      }

      throw err;
    }
  },

  async registarAbastecimento(
    sessionToken: string,
    payload: {
      motoristaId?: string;
      motoristaNomeSnapshot: string;
      motoristaQrCodigo?: string;
      cartaoId?: string;
      cartrackVehicleId: string;
      registration: string;
      fuelType: string;
      litros: number;
      quilometragemKm: number;
    }
  ): Promise<OficinaAbastecimentoConfirmado> {
    const result = await invokeOficinaTerminal<{ ok: boolean; operacao: OficinaAbastecimentoConfirmado }>({
      action: 'registar_abastecimento',
      ...payload
    }, sessionToken);

    return result.operacao;
  },

  async operacoesRecentes(sessionToken: string, limit = 20): Promise<OficinaOperacaoRecente[]> {
    const result = await invokeOficinaTerminal<{ items: OficinaOperacaoRecente[] }>({
      action: 'operacoes_recentes',
      limit
    }, sessionToken);

    return result.items || [];
  }
};
