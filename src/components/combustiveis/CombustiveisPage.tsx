import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw, AlertTriangle, Fuel } from 'lucide-react';
import { combustiveisService } from '../../services/combustiveisService';
import { bpFuelService } from '../../services/bpFuelService';
import {
  DriverFuelRankingItem,
  FuelChartPoint,
  FuelFilters,
  FuelPeriod,
  FuelTransaction,
  TagFuelRankingItem,
  VehicleFuelRankingItem
} from '../../types/combustivel';
import { BpFuelConnectionStatus } from '../../types/bpFuel';
import { FuelKpiCards } from './FuelKpiCards';
import { FuelFilters as FuelFiltersPanel } from './FuelFilters';
import { FuelConsumptionChart } from './FuelConsumptionChart';
import { FuelCostChart } from './FuelCostChart';
import { VehicleFuelRanking } from './VehicleFuelRanking';
import { DriverFuelRanking } from './DriverFuelRanking';
import { TagFuelRanking } from './TagFuelRanking';
import { FuelTransactionsTable } from './FuelTransactionsTable';
import { FuelTransactionDetails } from './FuelTransactionDetails';
import { FuelTransactionForm } from './FuelTransactionForm';

function toChartBucketKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function chartLabel(date: Date): string {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildChartPoints(transactions: FuelTransaction[], period: FuelPeriod): FuelChartPoint[] {
  const buckets = new Map<string, FuelChartPoint>();
  const useWeekly = period === '30d' || period === 'this_month' || period === 'last_month';

  transactions.forEach((item) => {
    const date = new Date(item.abastecimento_ts);
    const bucketDate = useWeekly ? getWeekStart(date) : date;
    const key = toChartBucketKey(bucketDate);
    const current = buckets.get(key) || {
      key,
      label: useWeekly
        ? `Sem ${bucketDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`
        : chartLabel(bucketDate),
      liters: 0,
      cost: 0,
      avgCostPerLiter: 0,
      avgConsumptionL100: null
    };

    current.liters += item.liters;
    current.cost += item.total_cost;

    const totalLiters = current.liters;
    current.avgCostPerLiter = totalLiters > 0 ? current.cost / totalLiters : 0;

    if (typeof item.consumption_l_per_100 === 'number' && Number.isFinite(item.consumption_l_per_100)) {
      const previous = current.avgConsumptionL100;
      current.avgConsumptionL100 = previous === null
        ? item.consumption_l_per_100
        : (previous + item.consumption_l_per_100) / 2;
    }

    buckets.set(key, current);
  });

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function buildVehicleRanking(transactions: FuelTransaction[]): VehicleFuelRankingItem[] {
  const grouped = new Map<string, VehicleFuelRankingItem>();

  transactions.forEach((item) => {
    const key = item.cartrack_vehicle_id || item.registration;
    const current = grouped.get(key) || {
      cartrack_vehicle_id: item.cartrack_vehicle_id,
      registration: item.registration,
      model: item.vehicle_model || 'N/D',
      driver_name: item.driver_name,
      liters: 0,
      total_cost: 0,
      avg_consumption_l100: null,
      variation_pct: null
    };

    current.liters += item.liters;
    current.total_cost += item.total_cost;

    if (typeof item.consumption_l_per_100 === 'number' && Number.isFinite(item.consumption_l_per_100)) {
      current.avg_consumption_l100 = current.avg_consumption_l100 === null
        ? item.consumption_l_per_100
        : (current.avg_consumption_l100 + item.consumption_l_per_100) / 2;
    }

    grouped.set(key, current);
  });

  return [...grouped.values()].sort((a, b) => b.liters - a.liters);
}

function buildDriverRanking(transactions: FuelTransaction[]): DriverFuelRankingItem[] {
  const grouped = new Map<string, DriverFuelRankingItem>();

  transactions.forEach((item) => {
    const key = item.driver_tag || item.driver_name || `unknown-${item.id}`;
    const current = grouped.get(key) || {
      driver_key: key,
      driver_name: item.driver_name || 'Motorista não registado',
      driver_tag: item.driver_tag,
      primary_vehicle: item.registration,
      liters: 0,
      total_transactions: 0,
      total_cost: 0,
      avg_consumption_l100: null
    };

    current.liters += item.liters;
    current.total_transactions += 1;
    current.total_cost += item.total_cost;

    if (!current.driver_tag && item.driver_tag) {
      current.driver_tag = item.driver_tag;
    }

    if (typeof item.consumption_l_per_100 === 'number' && Number.isFinite(item.consumption_l_per_100)) {
      current.avg_consumption_l100 = current.avg_consumption_l100 === null
        ? item.consumption_l_per_100
        : (current.avg_consumption_l100 + item.consumption_l_per_100) / 2;
    }

    grouped.set(key, current);
  });

  return [...grouped.values()].sort((a, b) => b.liters - a.liters);
}

function buildTagRanking(transactions: FuelTransaction[]): TagFuelRankingItem[] {
  const grouped = new Map<string, TagFuelRankingItem>();

  transactions.forEach((item) => {
    const tag = item.driver_tag || 'N/D';
    const current = grouped.get(tag) || {
      tag,
      driver_name: item.driver_name || 'Motorista não registado',
      vehicle_registration: item.registration || 'Não associado',
      liters: 0,
      total_transactions: 0,
      total_cost: 0
    };

    current.liters += item.liters;
    current.total_transactions += 1;
    current.total_cost += item.total_cost;

    if (current.driver_name === 'Motorista não registado' && item.driver_name) {
      current.driver_name = item.driver_name;
    }

    if ((!current.vehicle_registration || current.vehicle_registration === 'Não associado') && item.registration) {
      current.vehicle_registration = item.registration;
    }

    grouped.set(tag, current);
  });

  return [...grouped.values()].sort((a, b) => b.liters - a.liters);
}

function getSyncWindow(filters: FuelFilters): { startDate?: string; endDate?: string } {
  const now = new Date();
  const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
  const start = new Date(now);
  const end = new Date(now);

  if (filters.period === 'custom') {
    return {
      startDate: filters.startDate,
      endDate: filters.endDate
    };
  }

  if (filters.period === 'today') {
    return { startDate: dateOnly(start), endDate: dateOnly(end) };
  }

  if (filters.period === '7d') {
    start.setDate(start.getDate() - 6);
    return { startDate: dateOnly(start), endDate: dateOnly(end) };
  }

  if (filters.period === '30d') {
    start.setDate(start.getDate() - 29);
    return { startDate: dateOnly(start), endDate: dateOnly(end) };
  }

  if (filters.period === 'this_month') {
    start.setDate(1);
    return { startDate: dateOnly(start), endDate: dateOnly(end) };
  }

  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { startDate: dateOnly(startLastMonth), endDate: dateOnly(endLastMonth) };
}

function formatSyncTimestamp(value?: string): string {
  if (!value) {
    return 'N/D';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('pt-PT');
}

function toCsv(transactions: FuelTransaction[]): string {
  const headers = [
    'data_hora',
    'matricula',
    'modelo',
    'motorista',
    'tag',
    'combustivel',
    'litros',
    'preco_litro',
    'total',
    'odometro_km',
    'posto',
    'centro_custo'
  ];

  const rows = transactions.map((item) => [
    item.abastecimento_ts,
    item.registration,
    item.vehicle_model || '',
    item.driver_name,
    item.driver_tag || '',
    item.fuel_type,
    item.liters.toFixed(2),
    item.price_per_liter.toFixed(3),
    item.total_cost.toFixed(2),
    item.odometer_km || '',
    item.station_name || '',
    item.cost_center || ''
  ]);

  return [headers, ...rows].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
}

export const CombustiveisPage: React.FC = () => {
  const [filters, setFilters] = useState<FuelFilters>(combustiveisService.defaultFilters());
  const [pendingFilters, setPendingFilters] = useState<FuelFilters>(combustiveisService.defaultFilters());
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<FuelTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ cartrack_vehicle_id: string; registration: string; model: string; suggested_driver_name?: string; suggested_driver_id?: string; suggested_tag?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<FuelTransaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'liters' | 'cost' | 'consumption'>('liters');
  const [bpStatus, setBpStatus] = useState<BpFuelConnectionStatus>({
    configured: false,
    environment: 'sandbox',
    message: 'A verificar...'
  });
  const [isSyncingBp, setIsSyncingBp] = useState(false);
  const [bpSyncMessage, setBpSyncMessage] = useState<string | null>(null);

  const loadData = async (activeFilters: FuelFilters, withLoader = true) => {
    if (withLoader) {
      setIsLoading(true);
    } else {
      setIsApplying(true);
    }

    setError(null);

    try {
      const data = await combustiveisService.getDashboardData(activeFilters);
      setTransactions(data.transactions);
      setPreviousTransactions(data.previousPeriodTransactions);
      setVehicles(data.vehiclesDirectory);
      setFilters(activeFilters);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar dados de combustíveis.');
    } finally {
      setIsLoading(false);
      setIsApplying(false);
    }
  };

  useEffect(() => {
    loadData(filters, true);
    bpFuelService.getConnectionStatus()
      .then(setBpStatus)
      .catch(() => {
        setBpStatus({
          configured: false,
          environment: 'sandbox',
          message: 'API BP não configurada'
        });
      });
  }, []);

  const summary = useMemo(() => combustiveisService.summarizeKpis(transactions), [transactions]);
  const trends = useMemo(() => combustiveisService.summarizeTrends(transactions, previousTransactions), [transactions, previousTransactions]);
  const chartPoints = useMemo(() => buildChartPoints(transactions, filters.period), [transactions, filters.period]);
  const vehicleRanking = useMemo(() => buildVehicleRanking(transactions), [transactions]);
  const driverRanking = useMemo(() => buildDriverRanking(transactions), [transactions]);
  const tagRanking = useMemo(() => buildTagRanking(transactions), [transactions]);

  const filterOptions = useMemo(() => {
    const registrations = Array.from(new Set(vehicles.map((vehicle) => vehicle.registration))).sort();
    const drivers = Array.from(new Set(transactions.map((item) => item.driver_name).filter(Boolean))).sort();
    const costCenters = Array.from(new Set(transactions.map((item) => item.cost_center).filter(Boolean) as string[])).sort();
    const stations = Array.from(new Set(transactions.map((item) => item.station_name).filter(Boolean) as string[])).sort();

    return { registrations, drivers, costCenters, stations };
  }, [transactions, vehicles]);

  const exportCsv = () => {
    const csvContent = toCsv(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `combustiveis-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const createTransaction = async (payload: any) => {
    await combustiveisService.createTransaction(payload);
    await loadData(filters, false);
  };

  const syncBp = async () => {
    setIsSyncingBp(true);
    setBpSyncMessage('Sincronizando dados BP...');

    try {
      const window = getSyncWindow(pendingFilters);
      const result = await bpFuelService.syncTransactions({
        startDate: window.startDate,
        endDate: window.endDate
      });

      setBpSyncMessage(`${result.message}: ${result.imported} novas, ${result.updated} atualizadas, ${result.duplicates} duplicadas.`);
      const status = await bpFuelService.getConnectionStatus();
      setBpStatus(status);
      await loadData(pendingFilters, false);
    } catch (syncError: any) {
      setBpSyncMessage(syncError?.message || 'Falha ao sincronizar dados BP.');
    } finally {
      setIsSyncingBp(false);
    }
  };

  const isEmpty = !isLoading && !error && transactions.length === 0;

  return (
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gestão de Combustíveis</h2>
          <p className="text-xs text-slate-400">Controlo de abastecimentos, consumos e custos da frota</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Dados BP</span>
            <span className={`text-xs font-semibold inline-flex items-center gap-1 ${bpStatus.configured ? 'text-emerald-300' : 'text-rose-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bpStatus.configured ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {bpStatus.configured ? 'Ligado' : 'Não configurado'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Última sincronização: {formatSyncTimestamp(bpStatus.lastSyncAt)}</span>
          </div>

          <button
            onClick={syncBp}
            disabled={isSyncingBp || !bpStatus.configured}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBp ? 'animate-spin' : ''}`} />
            {isSyncingBp ? 'Sincronizando BP...' : 'Sincronizar BP'}
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60"
          >
            <Plus className="w-3.5 h-3.5" />
            Registo manual (opcional)
          </button>
          <button
            onClick={() => loadData(filters, false)}
            disabled={isApplying}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isApplying ? 'animate-spin' : ''}`} />
            Atualizar dados
          </button>
          <button
            onClick={exportCsv}
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Exportar relatório
          </button>
        </div>
      </section>

      {bpSyncMessage && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300">
          {bpSyncMessage}
        </div>
      )}

      <FuelKpiCards summary={summary} trends={trends} isLoading={isLoading} />

      <FuelFiltersPanel
        filters={pendingFilters}
        registrations={filterOptions.registrations}
        drivers={filterOptions.drivers}
        costCenters={filterOptions.costCenters}
        stations={filterOptions.stations}
        onChange={setPendingFilters}
        onApply={() => loadData(pendingFilters, false)}
        onClear={() => {
          const cleared = combustiveisService.defaultFilters();
          setPendingFilters(cleared);
          loadData(cleared, false);
        }}
        applying={isApplying}
      />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-rose-200">Erro ao carregar Combustíveis</h3>
            <p className="text-xs text-rose-100/80 mt-1">{error}</p>
            <button
              onClick={() => loadData(filters, true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 rounded-lg border border-rose-400/30"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Fuel className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">Sem abastecimentos registados</h3>
          <p className="text-xs text-slate-400 mt-1">Cria o primeiro abastecimento para começar a monitorizar custos e consumo.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo abastecimento
          </button>
        </div>
      )}

      {!error && !isEmpty && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <FuelConsumptionChart points={chartPoints} mode={chartMode} onModeChange={setChartMode} />
            <FuelCostChart points={chartPoints} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <VehicleFuelRanking items={vehicleRanking} />
            <DriverFuelRanking items={driverRanking} />
          </div>

          <TagFuelRanking items={tagRanking} />

          <FuelTransactionsTable transactions={transactions} onSelect={setSelectedTransaction} />
        </>
      )}

      <FuelTransactionDetails transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />

      <FuelTransactionForm
        open={isFormOpen}
        vehicles={vehicles}
        onClose={() => setIsFormOpen(false)}
        onSubmit={createTransaction}
      />
    </div>
  );
};
