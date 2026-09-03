import { supabase } from '../api/supabaseClient';
import {
  AcessoViaturasModo,
  CartaoAbastecimento,
  CartaoHistoricoItem,
  OficinaMecanicoAcesso,
  OficinaMecanicoEstado,
  OficinaMotoristaResumo
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

export const oficinaAdminService = {
  async listAcessos(): Promise<OficinaMecanicoAcesso[]> {
    const result = await invokeOficinaAuth<{ items: OficinaMecanicoAcesso[] }>({
      action: 'list_accesses'
    });

    return result.items || [];
  },

  async createMecanico(nome: string, codigo?: string): Promise<{ item: OficinaMecanicoAcesso; generatedCode: string }> {
    return await invokeOficinaAuth<{ item: OficinaMecanicoAcesso; generatedCode: string }>({
      action: 'create_access',
      nome,
      codigo
    });
  },

  async setEstado(acessoId: string, estado: OficinaMecanicoEstado): Promise<void> {
    await invokeOficinaAuth<{ ok: boolean }>({
      action: 'set_state',
      acessoId,
      estado
    });
  },

  async regenerateCodigo(acessoId: string, codigo?: string): Promise<{ item: OficinaMecanicoAcesso; generatedCode: string }> {
    return await invokeOficinaAuth<{ item: OficinaMecanicoAcesso; generatedCode: string }>({
      action: 'regenerate_code',
      acessoId,
      codigo
    });
  },

  async listMotoristas(): Promise<OficinaMotoristaResumo[]> {
    const result = await invokeOficinaAuth<{ items: OficinaMotoristaResumo[] }>({
      action: 'list_motoristas'
    });

    return result.items || [];
  },

  async createMotorista(nome: string, externalDriverId?: string): Promise<{ item: OficinaMotoristaResumo }> {
    return await invokeOficinaAuth<{ item: OficinaMotoristaResumo }>({
      action: 'create_motorista',
      nome,
      externalDriverId
    });
  },

  async listVeiculos(): Promise<{ cartrack_vehicle_id: string; cartrack_registration: string; id_interno?: string | null }[]> {
    const result = await invokeOficinaAuth<{ items: { cartrack_vehicle_id: string; cartrack_registration: string; id_interno?: string | null }[] }>({
      action: 'list_veiculos'
    });

    return result.items || [];
  },

  async listCartoes(): Promise<CartaoAbastecimento[]> {
    const result = await invokeOficinaAuth<{ items: CartaoAbastecimento[] }>({
      action: 'list_cartoes'
    });

    return result.items || [];
  },

  async createCartao(motoristaId: string): Promise<{ item: CartaoAbastecimento }> {
    return await invokeOficinaAuth<{ item: CartaoAbastecimento }>({
      action: 'create_cartao',
      motoristaId
    });
  },

  async setCartaoEstado(cartaoId: string, estado: CartaoAbastecimento['estado']): Promise<void> {
    await invokeOficinaAuth<{ ok: boolean }>({
      action: 'set_cartao_estado',
      cartaoId,
      estado
    });
  },

  async regenerateCartao(cartaoId: string): Promise<{ item: CartaoAbastecimento }> {
    return await invokeOficinaAuth<{ item: CartaoAbastecimento }>({
      action: 'regenerate_cartao',
      cartaoId
    });
  },

  async cartaoHistorico(cartaoId: string): Promise<CartaoHistoricoItem[]> {
    const result = await invokeOficinaAuth<{ items: CartaoHistoricoItem[] }>({
      action: 'cartao_historico',
      cartaoId
    });

    return result.items || [];
  },

  async getMotoristaAcesso(motoristaId: string): Promise<{ modo: AcessoViaturasModo; veiculoIds: string[] }> {
    return await invokeOficinaAuth<{ modo: AcessoViaturasModo; veiculoIds: string[] }>({
      action: 'get_motorista_acesso',
      motoristaId
    });
  },

  async setMotoristaAcesso(motoristaId: string, modo: AcessoViaturasModo, veiculoIds: string[]): Promise<void> {
    await invokeOficinaAuth<{ ok: boolean }>({
      action: 'set_motorista_acesso',
      motoristaId,
      modo,
      veiculoIds
    });
  }
};
