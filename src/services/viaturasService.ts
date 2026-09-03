import { cartrackApi } from '../api/cartrackApi';
import { supabase } from '../api/supabaseClient';
import { CartrackVehicleStatusRaw } from '../types/cartrack';
import { ViaturaCompleta, EstadoOperacional } from '../types/viaturaCompleta';
import { ViaturaAdminData, ViaturaDocumento, ViaturaManutencao } from '../types/viaturaAdmin';

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveTag(status?: CartrackVehicleStatusRaw): { tag?: string; source?: 'last_identification_tag_id' | 'driver.driver_id_tag' } {
  const lastIdentificationTag = normalizeText(status?.last_identification_tag_id);
  if (lastIdentificationTag && lastIdentificationTag !== '00000000-0000-0000-0000-000000000000') {
    return { tag: lastIdentificationTag, source: 'last_identification_tag_id' };
  }

  const driverTag = normalizeText(status?.driver?.driver_id_tag);
  if (driverTag) {
    return { tag: driverTag, source: 'driver.driver_id_tag' };
  }

  return {};
}

function resolveDriverName(status: CartrackVehicleStatusRaw | undefined, admin: ViaturaAdminData): string {
  const firstName = normalizeText(status?.driver?.first_name);
  const lastName = normalizeText(status?.driver?.last_name);
  const cartrackName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (cartrackName) {
    return cartrackName;
  }

  const adminName = normalizeText(admin.motorista_nome);
  if (adminName) {
    return adminName;
  }

  return 'Motorista não registado';
}

function resolveTimestamp(status?: CartrackVehicleStatusRaw): string | undefined {
  return status?.timestamp || status?.last_communication_time || status?.event_ts || status?.location?.updated || undefined;
}

function resolveEstadoOperacional(status?: CartrackVehicleStatusRaw): EstadoOperacional {
  if (!status) {
    return 'sem_sinal';
  }

  const lastCommunication = resolveTimestamp(status);
  const lastCommunicationMs = lastCommunication ? Date.parse(lastCommunication) : Number.NaN;
  const isFresh = Number.isFinite(lastCommunicationMs)
    ? (Date.now() - lastCommunicationMs) / (1000 * 60) <= 120
    : false;

  const hasGpsCoordinates = hasFiniteNumber(status.latitude) && hasFiniteNumber(status.longitude);
  const hasTelemetrySignal = Boolean(
    lastCommunication ||
    hasGpsCoordinates ||
    hasFiniteNumber(status.speed) ||
    typeof status.ignition === 'boolean' ||
    typeof status.idling === 'boolean'
  );

  if (hasFiniteNumber(status.speed) && status.speed > 3) {
    return 'em_marcha';
  }

  if (!isFresh && !hasGpsCoordinates && !hasFiniteNumber(status.speed) && typeof status.ignition !== 'boolean') {
    return 'sem_sinal';
  }

  if (!isFresh && !hasTelemetrySignal) {
    return 'sem_sinal';
  }

  if (status.ignition === true || status.idling === true) {
    return 'parado';
  }

  if (status.ignition === false) {
    return 'ignicao_off';
  }

  return hasTelemetrySignal ? 'parado' : 'sem_sinal';
}

export const viaturasService = {
  // Obter lista combinada de viaturas (Cartrack Telemática + Supabase Administrativo)
  getViaturas: async (): Promise<ViaturaCompleta[]> => {
    try {
      // 1. Buscar telemetria Cartrack
      const [vehiclesList, vehiclesStatus] = await Promise.all([
        cartrackApi.getVehicles(),
        cartrackApi.getVehiclesStatus()
      ]);

      console.info('[viaturasService] Resumo Cartrack', {
        totalVehicles: vehiclesList.length,
        totalStatuses: vehiclesStatus.length,
        sampleStatuses: vehiclesStatus.slice(0, 3).map(status => ({
          vehicle_id: status.vehicle_id,
          registration: status.registration,
          speed: status.speed,
          ignition: status.ignition,
          idling: status.idling,
          timestamp: resolveTimestamp(status),
          driver_id: status.driver?.driver_id,
          driver_first_name: status.driver?.first_name,
          driver_last_name: status.driver?.last_name,
          driver_id_tag: status.driver?.driver_id_tag,
          last_identification_tag_id: status.last_identification_tag_id,
          latitude: status.latitude,
          longitude: status.longitude,
          address: status.address
        }))
      });

      // Map rápido por vehicle_id e registration
      const statusMap = new Map<string, typeof vehiclesStatus[0]>();
      vehiclesStatus.forEach(s => {
        statusMap.set(String(s.vehicle_id), s);
        statusMap.set(s.registration.toUpperCase(), s);
      });

      // 2. Buscar dados administrativos do Supabase
      let adminMap = new Map<string, ViaturaAdminData>();
      try {
        const { data: dbAdmin } = await supabase.from('veiculos_admin').select('*');
        if (dbAdmin) {
          dbAdmin.forEach((row: ViaturaAdminData) => {
            adminMap.set(String(row.cartrack_vehicle_id), row);
            adminMap.set(row.cartrack_registration.toUpperCase(), row);
          });
        }
      } catch (err) {
        console.warn('[viaturasService] Supabase não disponível ou tabelas pendentes de DDL:', err);
      }

      // 3. Fundir dados
      const resultado: ViaturaCompleta[] = vehiclesList.map(v => {
        const vid = String(v.vehicle_id);
        const reg = v.registration;
        const st = statusMap.get(vid) || statusMap.get(reg.toUpperCase());
        const adm = adminMap.get(vid) || adminMap.get(reg.toUpperCase()) || {
          cartrack_vehicle_id: vid,
          cartrack_registration: reg,
          id_interno: `V-${vid.slice(-3)}`,
          centro_custo: 'Geral',
          categoria_interna: 'Ligeiro',
          propriedade: 'proprio',
          ativo: true
        };

        // Determinar estado operacional real
        const estado = resolveEstadoOperacional(st);
        const driverTagInfo = resolveTag(st);
        const motoristaNome = resolveDriverName(st, adm);

        return {
          cartrack_vehicle_id: vid,
          registration: reg,
          make: v.make || st?.make || 'N/D',
          model: v.model || st?.model || 'N/D',
          model_year: String(v.model_year || ''),
          chassis_number: v.chassis_number || '',
          latitude: hasFiniteNumber(st?.latitude) ? st.latitude : 0,
          longitude: hasFiniteNumber(st?.longitude) ? st.longitude : 0,
          address: st?.address || 'Sem localização reportada',
          speed: hasFiniteNumber(st?.speed) ? st.speed : 0,
          ignition: st?.ignition === true,
          odometer_km: hasFiniteNumber(st?.odometer_in_kms)
            ? st.odometer_in_kms
            : hasFiniteNumber(st?.odometer)
              ? st.odometer
              : v.initial_odometer || 0,
          last_communication: resolveTimestamp(st) || new Date().toISOString(),
          estado_operacional: estado,
          motorista_nome: motoristaNome,
          motorista_id: normalizeText(st?.driver?.driver_id),
          motorista_tag: driverTagInfo.tag,
          motorista_tag_origem: driverTagInfo.source,
          admin: adm,
          documentos: [],
          manutencoes: []
        };
      });

      return resultado;
    } catch (error) {
      console.error('[viaturasService] Erro na fusão de dados:', error);
      return [];
    }
  },

  // Guardar ou atualizar dados administrativos no Supabase
  saveAdminData: async (adminData: ViaturaAdminData): Promise<boolean> => {
    try {
      const { error } = await supabase.from('veiculos_admin').upsert({
        cartrack_vehicle_id: adminData.cartrack_vehicle_id,
        cartrack_registration: adminData.cartrack_registration,
        id_interno: adminData.id_interno,
        centro_custo: adminData.centro_custo,
        cliente: adminData.cliente,
        categoria_interna: adminData.categoria_interna,
        motorista_nome: adminData.motorista_nome,
        observacoes: adminData.observacoes,
        propriedade: adminData.propriedade,
        data_aquisicao: adminData.data_aquisicao,
        valor_aquisicao: adminData.valor_aquisicao,
        updated_at: new Date().toISOString()
      }, { onConflict: 'cartrack_vehicle_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[viaturasService] Erro ao guardar no Supabase:', err);
      return false;
    }
  }
};
