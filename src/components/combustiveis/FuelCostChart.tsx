import React from 'react';
import { FuelChartPoint } from '../../types/combustivel';

interface Props {
  points: FuelChartPoint[];
}

export const FuelCostChart: React.FC<Props> = ({ points }) => {
  const chartPoints = points.slice(-12);
  const maxCost = Math.max(...chartPoints.map((point) => point.cost), 0);
  const maxAvgPrice = Math.max(...chartPoints.map((point) => point.avgCostPerLiter), 0);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-100">Custos de combustível</h3>
        <p className="text-[11px] text-slate-400">Barras para custo e linha para custo médio por litro</p>
      </div>

      {chartPoints.length === 0 ? (
        <div className="h-64 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 flex items-center justify-center text-xs text-slate-500">
          Sem dados suficientes para o gráfico.
        </div>
      ) : (
        <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="h-full flex items-end gap-2">
            {chartPoints.map((point) => {
              const barHeight = maxCost > 0 ? Math.max((point.cost / maxCost) * 100, 2) : 2;
              const lineHeight = maxAvgPrice > 0 ? (point.avgCostPerLiter / maxAvgPrice) * 100 : 0;

              return (
                <div key={point.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2 relative min-w-0">
                  <div
                    className="absolute left-1/2 w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.65)]"
                    style={{ bottom: `${lineHeight}%`, transform: 'translateX(-50%)' }}
                    title={`${point.avgCostPerLiter.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/L`}
                  />
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-rose-600/70 to-orange-400/80 border border-rose-400/20"
                    style={{ height: `${barHeight}%` }}
                    title={point.cost.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  />
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
