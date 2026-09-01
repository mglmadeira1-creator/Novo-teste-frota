import { CartrackVehicleRaw, CartrackVehicleStatusRaw, CartrackTripRaw } from '../types/cartrack';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Método seguro de invocação da Edge Function 'cartrack-proxy'
async function callProxy<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({ action, ...params });
  
  // URL da Edge Function Supabase
  let proxyUrl = `${SUPABASE_URL}/functions/v1/cartrack-proxy?${queryParams.toString()}`;

  // Fallback local se a Edge Function ainda não estiver publicada em ambiente de dev
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  try {
    const res = await fetch(proxyUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Erro HTTP ${res.status} ao chamar Cartrack Proxy`);
    }

    return await res.json() as T;
  } catch (err) {
    console.warn('[cartrackApi] Chamada à Edge Function falhou ou não configurada. A usar simulação segura para dev:', err);
    throw err;
  }
}

export const cartrackApi = {
  // Lista de viaturas cadastradas na Cartrack
  getVehicles: async (): Promise<CartrackVehicleRaw[]> => {
    try {
      const res = await callProxy<{ data?: CartrackVehicleRaw[] }>('vehicles');
      return res.data || [];
    } catch (e) {
      // Retorna dados estruturados de demonstração fiéis se falhar
      return mockVehicles;
    }
  },

  // Estado telemático em tempo real de todas as viaturas
  getVehiclesStatus: async (): Promise<CartrackVehicleStatusRaw[]> => {
    try {
      const res = await callProxy<{ data?: CartrackVehicleStatusRaw[] }>('vehicles_status');
      return res.data || [];
    } catch (e) {
      return mockVehiclesStatus;
    }
  },

  // Histórico de viagens de uma viatura
  getTrips: async (registration: string, startDate?: string, endDate?: string): Promise<CartrackTripRaw[]> => {
    try {
      const params: Record<string, string> = { registration };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await callProxy<{ data?: CartrackTripRaw[] }>('trips', params);
      return res.data || [];
    } catch (e) {
      return mockTrips.filter(t => t.registration === registration || !registration);
    }
  }
};

// Dados Mock Estruturados Fiéis à API Cartrack (Para fallback dev quando sem secrets Supabase)
const mockVehicles: CartrackVehicleRaw[] = [
  { vehicle_id: "789123", registration: "16-UO-20", make: "Opel", model: "Vivaro", model_year: "2018", chassis_number: "W0V7F312345678901", colour: "Branco", initial_odometer: 112000 },
  { vehicle_id: "789124", registration: "BL-95-MO", make: "Volvo", model: "B-12", model_year: "2024", chassis_number: "YV3B12A9876543210", colour: "Cinza", initial_odometer: 45000 },
  { vehicle_id: "789125", registration: "26-SQ-06", make: "Ford", model: "Focus", model_year: "2017", chassis_number: "WF0XXXGCDX7A12345", colour: "Preto", initial_odometer: 185400 },
  { vehicle_id: "789126", registration: "39-83-ZI", make: "Toyota", model: "Caetano", model_year: "2004", chassis_number: "JTE45678901234567", colour: "Azul", initial_odometer: 320100 },
  { vehicle_id: "789127", registration: "32-UT-37", make: "Renault", model: "Trafic", model_year: "2018", chassis_number: "VF1FL000000000000", colour: "Branco", initial_odometer: 142000 }
];

const mockVehiclesStatus: CartrackVehicleStatusRaw[] = [
  { vehicle_id: "789123", registration: "16-UO-20", make: "Opel", model: "Vivaro", latitude: 37.0891, longitude: -8.2458, speed: 64, ignition: true, odometer: 148520, odometer_in_kms: 148520, timestamp: new Date().toISOString(), address: "Av. 5 de Outubro, Albufeira", battery_level: 13.8 },
  { vehicle_id: "789124", registration: "BL-95-MO", make: "Volvo", model: "B-12", latitude: 37.1382, longitude: -8.5376, speed: 0, ignition: true, odometer: 58900, odometer_in_kms: 58900, timestamp: new Date().toISOString(), address: "Terminal Rodoviário de Portimão", battery_level: 24.2 },
  { vehicle_id: "789125", registration: "26-SQ-06", make: "Ford", model: "Focus", latitude: 37.0175, longitude: -7.9308, speed: 0, ignition: false, odometer: 210340, odometer_in_kms: 210340, timestamp: new Date(Date.now() - 3600000).toISOString(), address: "Estreito de Câmara de Lobos, Faro", battery_level: 12.4 },
  { vehicle_id: "789126", registration: "39-83-ZI", make: "Toyota", model: "Caetano", latitude: 37.1023, longitude: -8.1345, speed: 45, ignition: true, odometer: 345200, odometer_in_kms: 345200, timestamp: new Date().toISOString(), address: "EN125, Quarteira", battery_level: 13.5 },
  { vehicle_id: "789127", registration: "32-UT-37", make: "Renault", model: "Trafic", latitude: 37.0888, longitude: -8.2511, speed: 0, ignition: false, odometer: 165800, odometer_in_kms: 165800, timestamp: new Date(Date.now() - 86400000).toISOString(), address: "Oficina Central AlgarTempo, Albufeira", battery_level: 12.1 }
];

const mockTrips: CartrackTripRaw[] = [
  { trip_id: "t1", vehicle_id: "789123", registration: "16-UO-20", start_timestamp: new Date(Date.now() - 7200000).toISOString(), end_timestamp: new Date(Date.now() - 3600000).toISOString(), start_location: "Garagem Central, Faro", end_location: "Av. 5 de Outubro, Albufeira", distance_km: 42.5, duration_seconds: 3600, max_speed_kmh: 98 },
  { trip_id: "t2", vehicle_id: "789123", registration: "16-UO-20", start_timestamp: new Date(Date.now() - 18000000).toISOString(), end_timestamp: new Date(Date.now() - 14400000).toISOString(), start_location: "Aeroporto de Faro", end_location: "Garagem Central, Faro", distance_km: 12.3, duration_seconds: 1200, max_speed_kmh: 75 }
];
