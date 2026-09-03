import React from 'react';
import { VehicleFuelRankingItem } from '../../types/combustivel';

interface Props {
  items: VehicleFuelRankingItem[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function formatConsumption(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'N/D';
  }

  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L/100 km`;
}

export const VehicleFuelRanking: React.FC<Props> = ({ items }) => {
  const top = items.slice(0, 8);
  const maxLiters = Math.max(...top.map((item) => item.liters), 0);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-100">Viaturas com maior consumo</h3>
      <p className="text-[11px] text-slate-400 mb-3">Ranking de litros abastecidos no período</p>

      <div className="space-y-2">
        {top.length === 0 && (
          <div className="border border-dashed border-slate-700 rounded-lg py-8 text-center text-xs text-slate-500">
            Sem dados de consumo por viatura.
          </div>
        )}

        {top.map((item, index) => {
          const ratio = maxLiters > 0 ? (item.liters / maxLiters) * 100 : 0;
          return (
            <div key={`${item.cartrack_vehicle_id}-${item.registration}`} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-400 w-6">#{index + 1}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block">{item.registration} · {item.model}</span>
                    <span className="text-[11px] text-slate-400 truncate block">{item.driver_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-cyan-300 block">{item.liters.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} L</span>
                  <span className="text-[11px] text-slate-400">{formatCurrency(item.total_cost)}</span>
                </div>
              </div>

              <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-400" style={{ width: `${ratio}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>{formatConsumption(item.avg_consumption_l100)}</span>
                <span>
                  {item.variation_pct === null
                    ? 'Sem variação'
                    : `${item.variation_pct >= 0 ? '+' : ''}${item.variation_pct.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
