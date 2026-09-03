import { ViaturaAdminData, ViaturaDocumento, ViaturaManutencao } from './viaturaAdmin';

export type EstadoOperacional = 'em_marcha' | 'parado' | 'ignicao_off' | 'sem_sinal';

export interface ViaturaCompleta {
  // Dados Telemáticos (Cartrack - Fonte de Verdade)
  cartrack_vehicle_id: string;
  registration: string;
  make: string;
  model: string;
  model_year?: string;
  chassis_number?: string;
  
  // Telemetria Live
  latitude: number;
  longitude: number;
  address: string;
  speed: number;
  ignition: boolean;
  odometer_km: number;
  last_communication: string;
  estado_operacional: EstadoOperacional;
  motorista_nome: string;
  motorista_id?: string;
  motorista_tag?: string;
  motorista_tag_origem?: 'last_identification_tag_id' | 'driver.driver_id_tag';

  // Dados Administrativos (Supabase)
  admin: ViaturaAdminData;
  documentos: ViaturaDocumento[];
  manutencoes: ViaturaManutencao[];
}
