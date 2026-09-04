import { CartrackVehicleRaw, CartrackVehicleStatusRaw, CartrackTripPoint, CartrackTripRaw } from '../types/cartrack';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMeaningfulIdentifier(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed !== '00000000-0000-0000-0000-000000000000';
}

function normalizeCartrackTimestamp(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const withIsoSeparator = trimmed.replace(' ', 'T');
  const withTimezone = withIsoSeparator.replace(/([+-]\d{2})$/, '$1:00');
  const parsed = Date.parse(withTimezone);

  return Number.isNaN(parsed) ? trimmed : new Date(parsed).toISOString();
}

function normalizeOdometerKm(status: CartrackVehicleStatusRaw): number | undefined {
  if (isFiniteNumber(status.odometer_in_kms)) {
    return status.odometer_in_kms;
  }

  if (!isFiniteNumber(status.odometer)) {
    return undefined;
  }

  if (status.location || status.event_ts) {
    return Math.round(status.odometer / 1000);
  }

  return status.odometer;
}

function normalizeVehicleStatus(status: CartrackVehicleStatusRaw): CartrackVehicleStatusRaw {
  const timestamp = normalizeCartrackTimestamp(
    status.timestamp ?? status.event_ts ?? status.last_communication_time ?? status.location?.updated
  );

  const latitude = isFiniteNumber(status.latitude)
    ? status.latitude
    : isFiniteNumber(status.location?.latitude)
      ? status.location.latitude
      : undefined;

  const longitude = isFiniteNumber(status.longitude)
    ? status.longitude
    : isFiniteNumber(status.location?.longitude)
      ? status.location.longitude
      : undefined;

  const address = status.address ?? status.location?.position_description ?? undefined;
  const batteryLevel = isFiniteNumber(status.battery_level)
    ? status.battery_level
    : isFiniteNumber(status.electric?.battery_percentage_left)
      ? status.electric.battery_percentage_left
      : undefined;
  const fuelLevel = isFiniteNumber(status.fuel_level)
    ? status.fuel_level
    : isFiniteNumber(status.fuel?.level)
      ? status.fuel.level
      : undefined;

  return {
    ...status,
    timestamp,
    last_communication_time: timestamp,
    latitude,
    longitude,
    address,
    speed: isFiniteNumber(status.speed) ? status.speed : undefined,
    odometer_in_kms: normalizeOdometerKm(status),
    battery_level: batteryLevel,
    fuel_level: fuelLevel
  };
}

function logVehiclesStatusShape(statuses: CartrackVehicleStatusRaw[]): void {
  if (!statuses.length) {
    console.info('[cartrackApi] vehicles_status respondeu sem registos');
    return;
  }

  const sample = statuses[0];
  console.info('[cartrackApi] vehicles_status shape', {
    total: statuses.length,
    topLevelKeys: Object.keys(sample).sort(),
    locationKeys: sample.location ? Object.keys(sample.location).sort() : [],
    sample: {
      vehicle_id: sample.vehicle_id,
      registration: sample.registration,
      event_ts: sample.event_ts,
      timestamp: sample.timestamp,
      speed: sample.speed,
      ignition: sample.ignition,
      idling: sample.idling,
      driver_id: sample.driver?.driver_id,
      driver_name: `${sample.driver?.first_name || ''} ${sample.driver?.last_name || ''}`.trim() || undefined,
      driver_id_tag: sample.driver?.driver_id_tag,
      last_identification_tag_id: sample.last_identification_tag_id,
      normalized_tag: isMeaningfulIdentifier(sample.last_identification_tag_id)
        ? sample.last_identification_tag_id
        : isMeaningfulIdentifier(sample.driver?.driver_id_tag)
          ? sample.driver?.driver_id_tag
          : undefined,
      latitude: sample.latitude,
      longitude: sample.longitude,
      gps_fix_type: sample.location?.gps_fix_type,
      address: sample.address
    }
  });
}

// Método seguro de invocação da Edge Function 'cartrack-proxy'
async function callProxy<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({ action, ...params });
  
  // URL da Edge Function Supabase
  let proxyUrl = `${SUPABASE_URL}/functions/v1/cartrack-proxy?${queryParams.toString()}`;
  try {
    const res = await fetch(proxyUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json() as { error?: string; details?: string };
        detail = body.details || body.error || '';
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `Erro HTTP ${res.status} ao chamar Cartrack Proxy`);
    }

    return await res.json() as T;
  } catch (err) {
    console.error('[cartrackApi] Chamada à Edge Function falhou:', err);
    throw err;
  }
}

function extractCollection<T>(response: unknown, keys: string[]): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const record = response as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
}

function normalizeTrip(trip: CartrackTripRaw): CartrackTripRaw {
  const raw = trip as CartrackTripRaw & Record<string, unknown>;
  const rawPoints = raw.points || raw.route || raw.route_points || raw.locations || raw.track;
  const points: CartrackTripPoint[] | undefined = Array.isArray(rawPoints)
    ? rawPoints.reduce<CartrackTripPoint[]>((result, point) => {
        const item = point as Record<string, unknown>;
        const latitude = Number(item.latitude ?? item.lat);
        const longitude = Number(item.longitude ?? item.lng ?? item.lon);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          result.push({ latitude, longitude, timestamp: String(item.timestamp || item.event_ts || '') || undefined });
        }
        return result;
      }, [])
    : undefined;
  const distance = Number(raw.distance_km ?? raw.distance_in_kms ?? raw.distance);
  const distanceMeters = Number(raw.distance_meters ?? raw.distance_in_meters);
  return {
    ...trip,
    start_timestamp: String(raw.start_timestamp || raw.start_time || raw.started_at || ''),
    end_timestamp: String(raw.end_timestamp || raw.end_time || raw.ended_at || ''),
    start_location: String(raw.start_location || raw.start_address || ''),
    end_location: String(raw.end_location || raw.end_address || ''),
    distance_km: Number.isFinite(distance) ? distance : Number.isFinite(distanceMeters) ? distanceMeters / 1000 : undefined,
    duration_seconds: Number(raw.duration_seconds ?? raw.duration_in_seconds ?? raw.duration) || undefined,
    max_speed_kmh: Number(raw.max_speed_kmh ?? raw.max_speed) || undefined,
    points
  };
}

export const cartrackApi = {
  // Lista de viaturas cadastradas na Cartrack
  getVehicles: async (): Promise<CartrackVehicleRaw[]> => {
    try {
      const res = await callProxy<{ data?: CartrackVehicleRaw[] }>('vehicles');
      return res.data || [];
    } catch (e) {
      console.error('[cartrackApi] Falha ao obter viaturas Cartrack:', e);
      return [];
    }
  },

  // Estado telemático em tempo real de todas as viaturas
  getVehiclesStatus: async (): Promise<CartrackVehicleStatusRaw[]> => {
    try {
      const res = await callProxy<{ data?: CartrackVehicleStatusRaw[] }>('vehicles_status', { limit: '1000' });
      const normalizedStatuses = (res.data || []).map(normalizeVehicleStatus);
      logVehiclesStatusShape(normalizedStatuses);
      return normalizedStatuses;
    } catch (e) {
      console.error('[cartrackApi] Falha ao obter estado telemático Cartrack:', e);
      return [];
    }
  },

  // Histórico de viagens de uma viatura
  getTrips: async (registration: string, startDate?: string, endDate?: string, vehicleId?: string): Promise<CartrackTripRaw[]> => {
    const params: Record<string, string> = vehicleId ? { vehicle_id: vehicleId } : { registration };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await callProxy<unknown>('trips', params);
    const trips = extractCollection<CartrackTripRaw>(response, ['data', 'trips', 'results', 'items']);
    console.info('[cartrackApi] trips response', { registration, total: trips.length });
    return trips.map(normalizeTrip).filter((trip) => trip.start_timestamp && trip.end_timestamp);
  }
};
