export interface CartrackVehicleRaw {
  vehicle_id: string | number;
  terminal_id?: number;
  registration: string;
  make?: string;
  model?: string;
  model_year?: string | number;
  chassis_number?: string;
  colour?: string;
  initial_odometer?: number;
  is_under_maintenance?: boolean;
}

export interface CartrackVehicleStatusRaw {
  vehicle_id: string | number;
  registration: string;
  make?: string;
  model?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  ignition?: boolean;
  odometer?: number;
  odometer_in_kms?: number;
  timestamp?: string;
  last_communication_time?: string;
  address?: string;
  battery_level?: number;
  fuel_level?: number;
}

export interface CartrackTripRaw {
  trip_id?: string;
  vehicle_id: string | number;
  registration: string;
  start_timestamp: string;
  end_timestamp: string;
  start_location?: string;
  end_location?: string;
  distance_km?: number;
  duration_seconds?: number;
  max_speed_kmh?: number;
}
