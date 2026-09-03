import React from 'react';
import { TagFuelRankingItem } from '../../types/combustivel';

interface Props {
  items: TagFuelRankingItem[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

export const TagFuelRanking: React.FC<Props> = ({ items }) => {
  const top = items.slice(0, 8);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-100">Top TAGs</h3>
      <p className="text-[11px] text-slate-400 mb-3">Volume de abastecimento por TAG BP</p>

      <div className="space-y-2">
        {top.length === 0 && (
          <div className="border border-dashed border-slate-700 rounded-lg py-8 text-center text-xs text-slate-500">
            Sem dados de TAG para o período selecionado.
          </div>
        )}

        {top.map((item, index) => (
          <div key={item.tag} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs text-slate-400 font-mono block">#{index + 1}</span>
                <span className="text-xs font-semibold text-slate-200 block">TAG: {item.tag}</span>
                <span className="text-[11px] text-slate-400 block">Motorista: {item.driver_name}</span>
                <span className="text-[11px] text-slate-500 block">Viatura: {item.vehicle_registration}</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-cyan-300 block">{item.liters.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} L</span>
                <span className="text-[11px] text-slate-400">{item.total_transactions} abastecimentos</span>
                <span className="text-[11px] text-slate-400 block">{formatCurrency(item.total_cost)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
