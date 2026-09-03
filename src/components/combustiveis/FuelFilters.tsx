import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { FuelFilters as FuelFiltersModel, FuelType } from '../../types/combustivel';

interface Props {
  filters: FuelFiltersModel;
  registrations: string[];
  drivers: string[];
  costCenters: string[];
  stations: string[];
  onChange: (next: FuelFiltersModel) => void;
  onApply: () => void;
  onClear: () => void;
  applying: boolean;
}

const fuelOptions: Array<{ value: FuelType; label: string }> = [
  { value: 'gasoleo', label: 'Gasóleo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'adblue', label: 'AdBlue' },
  { value: 'gpl', label: 'GPL' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'outro', label: 'Outro' }
];

export const FuelFilters: React.FC<Props> = ({
  filters,
  registrations,
  drivers,
  costCenters,
  stations,
  onChange,
  onApply,
  onClear,
  applying
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
        <Filter className="w-4 h-4 text-sky-400" />
        Filtros de análise
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Período</span>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            value={filters.period}
            onChange={(e) => onChange({ ...filters, period: e.target.value as FuelFiltersModel['period'] })}
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês anterior</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        {filters.period === 'custom' && (
          <>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-400">Data inicial</span>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-400">Data final</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </label>
          </>
        )}

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Matrícula</span>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            value={filters.registration || ''}
            onChange={(e) => onChange({ ...filters, registration: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {registrations.map((registration) => (
              <option key={registration} value={registration}>{registration}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Motorista</span>
          <input
            list="fuel-driver-list"
            value={filters.driverName || ''}
            placeholder="Nome do motorista"
            onChange={(e) => onChange({ ...filters, driverName: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <datalist id="fuel-driver-list">
            {drivers.map((driver) => <option key={driver} value={driver} />)}
          </datalist>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Centro de custo</span>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            value={filters.costCenter || ''}
            onChange={(e) => onChange({ ...filters, costCenter: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {costCenters.map((costCenter) => (
              <option key={costCenter} value={costCenter}>{costCenter}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Tipo de combustível</span>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            value={filters.fuelType || ''}
            onChange={(e) => onChange({ ...filters, fuelType: (e.target.value as FuelType) || undefined })}
          >
            <option value="">Todos</option>
            {fuelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Posto</span>
          <input
            list="fuel-station-list"
            value={filters.stationName || ''}
            placeholder="Ex: Galp, Repsol"
            onChange={(e) => onChange({ ...filters, stationName: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <datalist id="fuel-station-list">
            {stations.map((station) => <option key={station} value={station} />)}
          </datalist>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Preço mínimo/L</span>
          <input
            type="number"
            min={0}
            step="0.001"
            value={filters.minPricePerLiter ?? ''}
            onChange={(e) => onChange({ ...filters, minPricePerLiter: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-400">Preço máximo/L</span>
          <input
            type="number"
            min={0}
            step="0.001"
            value={filters.maxPricePerLiter ?? ''}
            onChange={(e) => onChange({ ...filters, maxPricePerLiter: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpar
        </button>
        <button
          onClick={onApply}
          disabled={applying}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white rounded-lg transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          {applying ? 'A aplicar...' : 'Aplicar filtros'}
        </button>
      </div>
    </div>
  );
};
