import { cartrackApi } from '../api/cartrackApi';
import { supabase } from '../api/supabaseClient';
import { ViaturaCompleta, EstadoOperacional } from '../types/viaturaCompleta';
import { ViaturaAdminData, ViaturaDocumento, ViaturaManutencao } from '../types/viaturaAdmin';

export const viaturasService = {
  // Obter lista combinada de viaturas (Cartrack Telemática + Supabase Administrativo)
  getViaturas: async (): Promise<ViaturaCompleta[]> => {
    try {
      // 1. Buscar telemetria Cartrack
      const [vehiclesList, vehiclesStatus] = await Promise.all([
        cartrackApi.getVehicles(),
        cartrackApi.getVehiclesStatus()
      ]);

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
        let estado: EstadoOperacional = 'sem_sinal';
        if (st) {
          const now = Date.now();
          const lastComm = st.timestamp ? new Date(st.timestamp).getTime() : 0;
          const diffMinutes = (now - lastComm) / (1000 * 60);

          if (diffMinutes > 120) {
            estado = 'sem_sinal';
          } else if (st.speed && st.speed > 3) {
            estado = 'em_marcha';
          } else if (st.ignition) {
            estado = 'parado';
          } else {
            estado = 'ignicao_off';
          }
        }

        return {
          cartrack_vehicle_id: vid,
          registration: reg,
          make: v.make || st?.make || 'N/D',
          model: v.model || st?.model || 'N/D',
          model_year: String(v.model_year || ''),
          chassis_number: v.chassis_number || '',
          latitude: st?.latitude || 0,
          longitude: st?.longitude || 0,
          address: st?.address || 'Sem localização reportada',
          speed: st?.speed || 0,
          ignition: st?.ignition || false,
          odometer_km: st?.odometer || st?.odometer_in_kms || v.initial_odometer || 0,
          last_communication: st?.timestamp || new Date().toISOString(),
          estado_operacional: estado,
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
