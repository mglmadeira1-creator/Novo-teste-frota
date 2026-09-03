import { cartrackApi } from '../api/cartrackApi';
import { supabase } from '../api/supabaseClient';
import {
  CreateFuelTransactionInput,
  FuelDashboardData,
  FuelDriver,
  FuelFilters,
  FuelKpiSummary,
  FuelTransaction,
  FuelTrendDelta,
  FuelType,
  FuelVehicleDirectoryItem
} from '../types/combustivel';
import { CartrackVehicleStatusRaw } from '../types/cartrack';

interface DateRange {
  startIso: string;
  endIso: string;
}

interface BpFuelTransactionRow {
  id: string;
  transaction_datetime?: string | null;
  transaction_date?: string | null;
  transaction_time?: string | null;
  card_id?: string | null;
  driver_tag?: string | null;
  vehicle_id?: string | null;
  vehicle_registration?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  fuel_type?: string | null;
  litres?: number | null;
  price_per_litre?: number | null;
  total_amount?: number | null;
  odometer?: number | null;
  site_name?: string | null;
  site_address?: string | null;
  cost_center?: string | null;
  motorista?: FuelDriver[] | FuelDriver | null;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeFuelType(value?: string | null): FuelType {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('diesel') || normalized.includes('gasoleo') || normalized.includes('gasoil')) return 'gasoleo';
  if (normalized.includes('gasoline') || normalized.includes('gasolina') || normalized.includes('petrol')) return 'gasolina';
  if (normalized.includes('adblue')) return 'adblue';
  if (normalized.includes('gpl') || normalized.includes('lpg')) return 'gpl';
  if (normalized.includes('eletric') || normalized.includes('electric')) return 'eletrico';
  return 'outro';
}

function resolveCartrackTag(status: CartrackVehicleStatusRaw): string | undefined {
  const topLevel = normalizeText(status.last_identification_tag_id);
  if (topLevel && topLevel !== '00000000-0000-0000-0000-000000000000') {
    return topLevel;
  }

  return normalizeText(status.driver?.driver_id_tag);
}

function resolveCartrackDriverName(status: CartrackVehicleStatusRaw): string | undefined {
  const firstName = normalizeText(status.driver?.first_name);
  const lastName = normalizeText(status.driver?.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || undefined;
}

function getDateRange(filters: FuelFilters): DateRange {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  end.setHours(23, 59, 59, 999);

  if (filters.period === 'custom') {
    const startCustom = filters.startDate ? new Date(filters.startDate) : new Date(now);
    const endCustom = filters.endDate ? new Date(filters.endDate) : new Date(now);
    startCustom.setHours(0, 0, 0, 0);
    endCustom.setHours(23, 59, 59, 999);

    return {
      startIso: startCustom.toISOString(),
      endIso: endCustom.toISOString()
    };
  }

  if (filters.period === 'today') {
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (filters.period === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (filters.period === '30d') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (filters.period === 'this_month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return {
    startIso: startLastMonth.toISOString(),
    endIso: endLastMonth.toISOString()
  };
}

function getPreviousRange(current: DateRange): DateRange {
  const start = new Date(current.startIso);
  const end = new Date(current.endIso);
  const span = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - span);

  return {
    startIso: previousStart.toISOString(),
    endIso: previousEnd.toISOString()
  };
}

function calculateConsumption(transactions: FuelTransaction[]): FuelTransaction[] {
  const byVehicle = new Map<string, FuelTransaction[]>();

  transactions.forEach((transaction) => {
    const key = transaction.cartrack_vehicle_id || transaction.registration;
    const list = byVehicle.get(key) || [];
    list.push(transaction);
    byVehicle.set(key, list);
  });

  byVehicle.forEach((list) => {
    list.sort((a, b) => parseTimestamp(a.abastecimento_ts) - parseTimestamp(b.abastecimento_ts));

    for (let index = 1; index < list.length; index += 1) {
      const current = list[index];
      const previous = list[index - 1];

      if (!current.odometer_km || !previous.odometer_km) {
        continue;
      }

      const kmDelta = current.odometer_km - previous.odometer_km;
      if (kmDelta <= 0) {
        continue;
      }

      current.consumption_l_per_100 = (current.liters / kmDelta) * 100;
    }
  });

  return [...transactions].sort((a, b) => parseTimestamp(b.abastecimento_ts) - parseTimestamp(a.abastecimento_ts));
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

function summarize(transactions: FuelTransaction[]): FuelKpiSummary {
  const totals = transactions.reduce(
    (acc, item) => {
      acc.totalLiters += item.liters;
      acc.totalCost += item.total_cost;
      acc.totalTransactions += 1;
      if (typeof item.consumption_l_per_100 === 'number' && Number.isFinite(item.consumption_l_per_100)) {
        acc.consumptionValues.push(item.consumption_l_per_100);
      }
      return acc;
    },
    {
      totalLiters: 0,
      totalCost: 0,
      totalTransactions: 0,
      consumptionValues: [] as number[]
    }
  );

  const avgCostPerLiter = totals.totalLiters > 0 ? totals.totalCost / totals.totalLiters : 0;
  const avgConsumptionL100 = totals.consumptionValues.length
    ? totals.consumptionValues.reduce((sum, value) => sum + value, 0) / totals.consumptionValues.length
    : null;

  return {
    totalLiters: totals.totalLiters,
    totalCost: totals.totalCost,
    totalTransactions: totals.totalTransactions,
    avgCostPerLiter,
    avgConsumptionL100
  };
}

function summarizeTrends(current: FuelTransaction[], previous: FuelTransaction[]): FuelTrendDelta {
  const now = summarize(current);
  const old = summarize(previous);

  return {
    totalLitersDeltaPct: pctDelta(now.totalLiters, old.totalLiters),
    totalCostDeltaPct: pctDelta(now.totalCost, old.totalCost),
    totalTransactionsDeltaPct: pctDelta(now.totalTransactions, old.totalTransactions),
    avgCostPerLiterDeltaPct: pctDelta(now.avgCostPerLiter, old.avgCostPerLiter),
    avgConsumptionDeltaPct: pctDelta(now.avgConsumptionL100 || 0, old.avgConsumptionL100 || 0)
  };
}

function buildVehicleDirectoryFromCartrack(
  vehicles: Array<{ vehicle_id: string | number; registration: string; make?: string; model?: string }>,
  statuses: CartrackVehicleStatusRaw[]
): FuelVehicleDirectoryItem[] {
  const statusByVehicle = new Map<string, CartrackVehicleStatusRaw>();
  statuses.forEach((status) => {
    statusByVehicle.set(String(status.vehicle_id), status);
    statusByVehicle.set(status.registration.toUpperCase(), status);
  });

  return vehicles.map((vehicle) => {
    const keyById = String(vehicle.vehicle_id);
    const keyByReg = vehicle.registration.toUpperCase();
    const status = statusByVehicle.get(keyById) || statusByVehicle.get(keyByReg);

    return {
      cartrack_vehicle_id: keyById,
      registration: vehicle.registration,
      model: `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'N/D',
      suggested_driver_name: status ? resolveCartrackDriverName(status) : undefined,
      suggested_driver_id: normalizeText(status?.driver?.driver_id),
      suggested_tag: status ? resolveCartrackTag(status) : undefined
    };
  });
}

async function fetchVehicleDirectory(): Promise<FuelVehicleDirectoryItem[]> {
  const [vehicles, statuses] = await Promise.all([
    cartrackApi.getVehicles(),
    cartrackApi.getVehiclesStatus()
  ]);

  return buildVehicleDirectoryFromCartrack(vehicles, statuses);
}

function mapBpRowToTransaction(row: BpFuelTransactionRow, vehicleDirectory: FuelVehicleDirectoryItem[]): FuelTransaction {
  const registration = normalizeText(row.vehicle_registration) || 'N/D';
  const registrationKey = registration.toUpperCase();
  const directoryItem = vehicleDirectory.find((item) => item.registration.toUpperCase() === registrationKey);

  const relation = Array.isArray(row.motorista) ? row.motorista[0] : row.motorista;
  const driverName = normalizeText(row.driver_name) || normalizeText(relation?.nome) || 'Motorista não registado';
  const driverTag = normalizeText(row.driver_tag) || undefined;

  const isoFromDateTime = normalizeText(row.transaction_datetime);
  const date = normalizeText(row.transaction_date);
  const time = normalizeText(row.transaction_time) || '00:00:00';
  const fallbackDateTime = date ? `${date}T${time}` : new Date().toISOString();

  return {
    id: row.id,
    abastecimento_ts: isoFromDateTime || fallbackDateTime,
    cartrack_vehicle_id: normalizeText(row.vehicle_id) || directoryItem?.cartrack_vehicle_id || registration,
    registration,
    vehicle_model: directoryItem?.model || undefined,
    motorista_id: normalizeText(row.driver_id),
    tag_id: null,
    motorista_nome_snapshot: driverName,
    tag_codigo_snapshot: driverTag,
    fuel_type: normalizeFuelType(row.fuel_type),
    liters: normalizeNumber(row.litres) || 0,
    price_per_liter: normalizeNumber(row.price_per_litre) || 0,
    total_cost: normalizeNumber(row.total_amount) || 0,
    odometer_km: normalizeNumber(row.odometer),
    station_name: normalizeText(row.site_name) || undefined,
    station_location: normalizeText(row.site_address) || undefined,
    cost_center: normalizeText(row.cost_center) || undefined,
    notes: undefined,
    created_at: undefined,
    updated_at: undefined,
    motorista: relation || null,
    tag: null,
    driver_name: driverName,
    driver_tag: driverTag,
    consumption_l_per_100: undefined
  };
}

async function fetchTransactions(
  filters: FuelFilters,
  vehicleDirectory: FuelVehicleDirectoryItem[],
  overrideRange?: DateRange
): Promise<FuelTransaction[]> {
  const range = overrideRange || getDateRange(filters);

  let query = supabase
    .from('bp_fuel_transactions')
    .select(`
      id,
      transaction_datetime,
      transaction_date,
      transaction_time,
      card_id,
      driver_tag,
      vehicle_id,
      vehicle_registration,
      driver_id,
      driver_name,
      fuel_type,
      litres,
      price_per_litre,
      total_amount,
      odometer,
      site_name,
      site_address,
      cost_center,
      motorista:combustivel_motoristas(id, external_driver_id, nome)
    `)
    .gte('transaction_datetime', range.startIso)
    .lte('transaction_datetime', range.endIso)
    .order('transaction_datetime', { ascending: false, nullsFirst: false });

  if (filters.registration) {
    query = query.eq('vehicle_registration', filters.registration);
  }

  if (filters.driverName) {
    query = query.ilike('driver_name', `%${filters.driverName}%`);
  }

  if (filters.costCenter) {
    query = query.eq('cost_center', filters.costCenter);
  }

  if (filters.fuelType) {
    query = query.eq('fuel_type', filters.fuelType);
  }

  if (filters.stationName) {
    query = query.ilike('site_name', `%${filters.stationName}%`);
  }

  if (typeof filters.minPricePerLiter === 'number') {
    query = query.gte('price_per_litre', filters.minPricePerLiter);
  }

  if (typeof filters.maxPricePerLiter === 'number') {
    query = query.lte('price_per_litre', filters.maxPricePerLiter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const mapped = ((data || []) as unknown as BpFuelTransactionRow[])
    .map((row) => mapBpRowToTransaction(row, vehicleDirectory));

  return calculateConsumption(mapped);
}

export const combustiveisService = {
  defaultFilters(): FuelFilters {
    return {
      period: '30d'
    };
  },

  async getDashboardData(filters: FuelFilters): Promise<FuelDashboardData> {
    const currentRange = getDateRange(filters);
    const previousRange = getPreviousRange(currentRange);
    const vehiclesDirectory = await fetchVehicleDirectory();

    const [transactions, previousPeriodTransactions] = await Promise.all([
      fetchTransactions(filters, vehiclesDirectory, currentRange),
      fetchTransactions(filters, vehiclesDirectory, previousRange)
    ]);

    return {
      filters,
      transactions,
      previousPeriodTransactions,
      vehiclesDirectory
    };
  },

  summarizeKpis(transactions: FuelTransaction[]): FuelKpiSummary {
    return summarize(transactions);
  },

  summarizeTrends(current: FuelTransaction[], previous: FuelTransaction[]): FuelTrendDelta {
    return summarizeTrends(current, previous);
  },

  async createTransaction(input: CreateFuelTransactionInput): Promise<void> {
    const payload = {
      transaction_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      transaction_datetime: input.abastecimento_ts,
      transaction_date: input.abastecimento_ts.slice(0, 10),
      transaction_time: input.abastecimento_ts.slice(11, 19),
      card_id: null,
      driver_tag: input.tag_codigo_snapshot || null,
      vehicle_id: input.cartrack_vehicle_id,
      vehicle_registration: input.registration,
      driver_name: input.motorista_nome_snapshot || null,
      fuel_type: input.fuel_type,
      litres: input.liters,
      price_per_litre: input.price_per_liter,
      total_amount: input.total_cost,
      currency: 'EUR',
      odometer: input.odometer_km || null,
      site_id: null,
      site_name: input.station_name || null,
      site_address: input.station_location || null,
      country: null,
      invoice_number: null,
      cost_center: input.cost_center || null,
      raw_data: {
        source: 'manual_optional',
        notes: input.notes || null
      },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('bp_fuel_transactions').insert(payload);
    if (error) {
      throw new Error(error.message);
    }
  }
};
