export interface ViaturaAdminData {
  id?: string;
  cartrack_vehicle_id: string;
  cartrack_registration: string;
  id_interno?: string;
  centro_custo?: string;
  cliente?: string;
  categoria_interna?: string;
  motorista_associado_id?: string;
  motorista_nome?: string;
  observacoes?: string;
  propriedade?: 'proprio' | 'leasing' | 'renting' | 'ald';
  data_aquisicao?: string;
  valor_aquisicao?: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ViaturaDocumento {
  id?: string;
  cartrack_vehicle_id: string;
  tipo_documento: string;
  numero_documento?: string;
  entidade_emissora?: string;
  data_emissao?: string;
  data_validade?: string;
  ficheiro_url?: string;
  alertar_dias_antes?: number;
  observacoes?: string;
}

export interface ViaturaManutencao {
  id?: string;
  cartrack_vehicle_id: string;
  tipo_servico: string;
  intervalo_kms?: number;
  intervalo_dias?: number;
  ultimo_odometro_servico?: number;
  ultima_data_servico?: string;
  status?: 'pendente' | 'agendado' | 'concluido';
}
