export type FuelType = 'gasoleo' | 'gasolina' | 'adblue' | 'gpl' | 'eletrico' | 'outro';

export type FuelPeriod = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export interface FuelFilters {
  period: FuelPeriod;
  startDate?: string;
  endDate?: string;
  registration?: string;
  driverName?: string;
  costCenter?: string;
  fuelType?: FuelType;
  stationName?: string;
  minPricePerLiter?: number;
  maxPricePerLiter?: number;
}

export interface FuelDriver {
  id: string;
  external_driver_id?: string | null;
  nome?: string | null;
}

export interface FuelTag {
  id: string;
  codigo: string;
  motorista_id?: string | null;
}

export interface FuelTransactionRaw {
  id: string;
  abastecimento_ts: string;
  cartrack_vehicle_id: string;
  registration: string;
  vehicle_model?: string | null;
  motorista_id?: string | null;
  tag_id?: string | null;
  motorista_nome_snapshot?: string | null;
  tag_codigo_snapshot?: string | null;
  fuel_type: FuelType;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km?: number | null;
  station_name?: string | null;
  station_location?: string | null;
  cost_center?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  motorista?: FuelDriver | null;
  tag?: FuelTag | null;
}

export interface FuelTransaction extends FuelTransactionRaw {
  driver_name: string;
  driver_tag?: string;
  consumption_l_per_100?: number;
}

export interface FuelVehicleDirectoryItem {
  cartrack_vehicle_id: string;
  registration: string;
  model: string;
  suggested_driver_name?: string;
  suggested_driver_id?: string;
  suggested_tag?: string;
}

export interface FuelKpiSummary {
  totalLiters: number;
  totalCost: number;
  totalTransactions: number;
  avgCostPerLiter: number;
  avgConsumptionL100: number | null;
}

export interface FuelTrendDelta {
  totalLitersDeltaPct: number | null;
  totalCostDeltaPct: number | null;
  totalTransactionsDeltaPct: number | null;
  avgCostPerLiterDeltaPct: number | null;
  avgConsumptionDeltaPct: number | null;
}

export interface FuelChartPoint {
  key: string;
  label: string;
  liters: number;
  cost: number;
  avgCostPerLiter: number;
  avgConsumptionL100: number | null;
}

export interface VehicleFuelRankingItem {
  cartrack_vehicle_id: string;
  registration: string;
  model: string;
  driver_name: string;
  liters: number;
  total_cost: number;
  avg_consumption_l100: number | null;
  variation_pct: number | null;
}

export interface DriverFuelRankingItem {
  driver_key: string;
  driver_name: string;
  driver_tag?: string;
  primary_vehicle?: string;
  liters: number;
  total_transactions: number;
  total_cost: number;
  avg_consumption_l100: number | null;
}

export interface TagFuelRankingItem {
  tag: string;
  driver_name: string;
  vehicle_registration: string;
  liters: number;
  total_transactions: number;
  total_cost: number;
}

export interface FuelDashboardData {
  filters: FuelFilters;
  transactions: FuelTransaction[];
  previousPeriodTransactions: FuelTransaction[];
  vehiclesDirectory: FuelVehicleDirectoryItem[];
}

export interface CreateFuelTransactionInput {
  abastecimento_ts: string;
  cartrack_vehicle_id: string;
  registration: string;
  vehicle_model?: string;
  motorista_id?: string;
  motorista_nome_snapshot?: string;
  tag_codigo_snapshot?: string;
  fuel_type: FuelType;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km?: number;
  station_name?: string;
  station_location?: string;
  cost_center?: string;
  notes?: string;
}
