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

export interface CartrackVehicleLocationRaw {
  updated?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  gps_fix_type?: number | null;
  position_description?: string | null;
  geofence_ids?: string[] | null;
}

export interface CartrackVehicleFuelRaw {
  updated?: string | null;
  level?: number | null;
  precentage_left?: number | null;
  total_consumed?: number | null;
}

export interface CartrackVehicleElectricRaw {
  battery_percentage_left?: number | null;
  battery_ts?: string | null;
  charging_status?: string | null;
  charging_status_ts?: string | null;
}

export interface CartrackDriverRaw {
  driver_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  id_number?: string | null;
  license_number?: string | null;
  driver_id_tag?: string | null;
  phone_number?: string | null;
}

export interface CartrackVehicleStatusRaw {
  vehicle_id: string | number;
  registration: string;
  make?: string;
  model?: string;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  ignition?: boolean | null;
  idling?: boolean | null;
  odometer?: number | null;
  odometer_in_kms?: number | null;
  timestamp?: string;
  event_ts?: string | null;
  last_communication_time?: string;
  address?: string;
  battery_level?: number | null;
  fuel_level?: number | null;
  last_identification_tag_id?: string | null;
  driver?: CartrackDriverRaw | null;
  location?: CartrackVehicleLocationRaw;
  fuel?: CartrackVehicleFuelRaw;
  electric?: CartrackVehicleElectricRaw;
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
  points?: Array<{ latitude: number; longitude: number; timestamp?: string }>;
  route?: Array<{ latitude: number; longitude: number; timestamp?: string }>;
}
