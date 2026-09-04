export type OficinaMecanicoEstado = 'ativo' | 'bloqueado' | 'revogado';

export interface OficinaMecanicoAcesso {
  id: string;
  nome: string;
  codigo_hint: string;
  estado: OficinaMecanicoEstado;
  created_at: string;
  updated_at: string;
  ultimo_acesso_at?: string | null;
  bloqueado_at?: string | null;
  revogado_at?: string | null;
}

export interface OficinaLoginResult {
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

export interface OficinaMotoristaQrResult {
  cartao: {
    id: string;
    qrTokenId: string;
  };
  motorista: {
    id?: string;
    external_driver_id?: string;
    nome: string;
  };
}

export type CartaoAbastecimentoEstado = 'ativo' | 'bloqueado' | 'suspenso';

export type AcessoViaturasModo = 'todas' | 'restrito';

export interface CartaoAbastecimento {
  id: string;
  numero_cartao: string;
  estado: CartaoAbastecimentoEstado;
  created_at: string;
  updated_at: string;
  last_used_at?: string | null;
  ultimo_abastecimento_at?: string | null;
  motorista_id?: string;
  motorista_nome: string;
}

export interface CartaoResolveResult {
  cartao: {
    id: string;
    qrTokenId?: string;
    numeroCartao: string;
    estado: CartaoAbastecimentoEstado;
  };
  motorista: {
    id?: string;
    external_driver_id?: string;
    nome: string;
    acessoViaturas: AcessoViaturasModo;
  };
}

export interface CartaoHistoricoItem {
  id: string;
  operacao_ts: string;
  registration: string;
  cartrack_vehicle_id: string;
  mecanico_nome_snapshot: string;
  fuel_type: string;
  litros: number;
  quilometragem_km: number;
}

export interface OficinaMotoristaResumo {
  id: string;
  external_driver_id?: string | null;
  nome: string;
  acesso_viaturas: AcessoViaturasModo;
}

export interface OficinaAbastecimentoConfirmado {
  id: string;
  operacao_ts: string;
  motoristaNomeSnapshot: string;
  registration: string;
  fuelType: string;
  litros: number;
  quilometragemKm: number;
  mecanicoNome: string;
  terminalNome: string;
}

export interface OficinaViaturaItem {
  cartrack_vehicle_id: string;
  cartrack_registration: string;
  odometer_km?: number | null;
  motorista_associado_id?: string | null;
  motorista_nome?: string | null;
  ativo?: boolean;
}

export interface OficinaOperacaoRecente {
  id: string;
  operacao_ts: string;
  motorista_nome_snapshot: string;
  registration: string;
  cartrack_vehicle_id: string;
  mecanico_nome_snapshot: string;
  fuel_type: string;
  litros: number;
  quilometragem_km: number;
  origem: 'OFICINA';
  terminal_id: string;
}
