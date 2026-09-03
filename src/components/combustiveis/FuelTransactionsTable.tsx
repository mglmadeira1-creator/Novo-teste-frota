import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { FuelTransaction } from '../../types/combustivel';

interface Props {
  transactions: FuelTransaction[];
  onSelect: (transaction: FuelTransaction) => void;
}

type SortKey =
  | 'abastecimento_ts'
  | 'registration'
  | 'driver_name'
  | 'fuel_type'
  | 'liters'
  | 'price_per_liter'
  | 'total_cost'
  | 'odometer_km'
  | 'station_name'
  | 'cost_center';

function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString('pt-PT')} ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function formatLiters(value: number): string {
  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

function formatKm(value?: number | null): string {
  if (!value) {
    return 'N/D';
  }

  return `${value.toLocaleString('pt-PT')} km`;
}

function fuelBadgeClass(fuelType: FuelTransaction['fuel_type']): string {
  switch (fuelType) {
    case 'gasoleo':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'gasolina':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    case 'adblue':
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    case 'gpl':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'eletrico':
      return 'bg-violet-500/10 text-violet-300 border-violet-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  }
}

function fuelLabel(fuelType: FuelTransaction['fuel_type']): string {
  switch (fuelType) {
    case 'gasoleo':
      return 'Gasóleo';
    case 'gasolina':
      return 'Gasolina';
    case 'adblue':
      return 'AdBlue';
    case 'gpl':
      return 'GPL';
    case 'eletrico':
      return 'Elétrico';
    default:
      return 'Outro';
  }
}

export const FuelTransactionsTable: React.FC<Props> = ({ transactions, onSelect }) => {
  const [sortKey, setSortKey] = useState<SortKey>('abastecimento_ts');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const perPage = 10;

  const sorted = useMemo(() => {
    const filtered = transactions.filter((item) => {
      const term = search.toLowerCase();
      if (!term) {
        return true;
      }

      return [
        item.registration,
        item.vehicle_model,
        item.driver_name,
        item.driver_tag,
        item.station_name,
        item.cost_center
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });

    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const left = a[sortKey as keyof FuelTransaction] as unknown;
      const right = b[sortKey as keyof FuelTransaction] as unknown;

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }

      if (sortKey === 'abastecimento_ts') {
        return (new Date(String(left)).getTime() - new Date(String(right)).getTime()) * direction;
      }

      return String(left || '').localeCompare(String(right || ''), 'pt') * direction;
    });
  }, [transactions, sortKey, sortDirection, search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const changeSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDirection('desc');
    }
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ChevronDown className="w-3 h-3 text-slate-600" />;
    }

    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 text-sky-400" />
      : <ChevronDown className="w-3 h-3 text-sky-400" />;
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Histórico de abastecimentos</h3>
          <p className="text-[11px] text-slate-400">Detalhe operacional com ordenação, pesquisa e paginação</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar matrícula, motorista, TAG, posto..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('abastecimento_ts')}><div className="flex items-center gap-1">Data/Hora <SortIndicator column="abastecimento_ts" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('registration')}><div className="flex items-center gap-1">Viatura <SortIndicator column="registration" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('driver_name')}><div className="flex items-center gap-1">Motorista <SortIndicator column="driver_name" /></div></th>
              <th className="py-3 px-3">TAG</th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('fuel_type')}><div className="flex items-center gap-1">Combustível <SortIndicator column="fuel_type" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('liters')}><div className="flex items-center gap-1">Litros <SortIndicator column="liters" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('price_per_liter')}><div className="flex items-center gap-1">Preço/L <SortIndicator column="price_per_liter" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('total_cost')}><div className="flex items-center gap-1">Total <SortIndicator column="total_cost" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('odometer_km')}><div className="flex items-center gap-1">Odómetro <SortIndicator column="odometer_km" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('station_name')}><div className="flex items-center gap-1">Posto <SortIndicator column="station_name" /></div></th>
              <th className="py-3 px-3 cursor-pointer" onClick={() => changeSort('cost_center')}><div className="flex items-center gap-1">Centro de custo <SortIndicator column="cost_center" /></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paged.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td className="py-3 px-3 font-mono text-[11px]">{formatDate(item.abastecimento_ts)}</td>
                <td className="py-3 px-3">
                  <span className="font-semibold text-slate-200 block">{item.registration}</span>
                  <span className="text-[10px] text-slate-500">{item.vehicle_model || 'N/D'}</span>
                </td>
                <td className="py-3 px-3">{item.driver_name}</td>
                <td className="py-3 px-3 font-mono text-[11px]">{item.driver_tag || '-'}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] ${fuelBadgeClass(item.fuel_type)}`}>
                    {fuelLabel(item.fuel_type)}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono">{formatLiters(item.liters)}</td>
                <td className="py-3 px-3 font-mono">{formatCurrency(item.price_per_liter)}</td>
                <td className="py-3 px-3 font-mono font-semibold text-slate-100">{formatCurrency(item.total_cost)}</td>
                <td className="py-3 px-3 font-mono">{formatKm(item.odometer_km)}</td>
                <td className="py-3 px-3">{item.station_name || 'N/D'}</td>
                <td className="py-3 px-3">{item.cost_center || 'N/D'}</td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td className="py-8 text-center text-slate-500" colSpan={11}>Sem abastecimentos para os filtros aplicados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden p-3 space-y-2">
        {paged.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left bg-slate-950 border border-slate-800 rounded-lg p-3 hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-100">{item.registration}</span>
              <span className="text-xs font-mono text-emerald-300">{formatCurrency(item.total_cost)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{item.driver_name} · TAG: {item.driver_tag || '-'}</p>
            <p className="text-[11px] text-slate-500">{formatDate(item.abastecimento_ts)} · {formatLiters(item.liters)} · {fuelLabel(item.fuel_type)}</p>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between text-[11px] text-slate-400">
        <span>{sorted.length} registos</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="px-2 py-1 rounded border border-slate-700 disabled:opacity-50"
          >Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="px-2 py-1 rounded border border-slate-700 disabled:opacity-50"
          >Seguinte</button>
        </div>
      </div>
    </section>
  );
};
