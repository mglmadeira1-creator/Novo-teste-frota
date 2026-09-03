import React from 'react';
import { FuelChartPoint } from '../../types/combustivel';

type Mode = 'liters' | 'cost' | 'consumption';

interface Props {
  points: FuelChartPoint[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

function getSeriesValue(point: FuelChartPoint, mode: Mode): number {
  if (mode === 'liters') return point.liters;
  if (mode === 'cost') return point.cost;
  return point.avgConsumptionL100 || 0;
}

function formatValue(value: number, mode: Mode): string {
  if (mode === 'liters') {
    return `${value.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} L`;
  }

  if (mode === 'cost') {
    return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }

  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L/100 km`;
}

export const FuelConsumptionChart: React.FC<Props> = ({ points, mode, onModeChange }) => {
  const chartPoints = points.slice(-12);
  const values = chartPoints.map((point) => getSeriesValue(point, mode));
  const maxValue = Math.max(...values, 0);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Evolução do consumo</h3>
          <p className="text-[11px] text-slate-400">Análise temporal por período selecionado</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center gap-1">
          {[
            { id: 'liters', label: 'Litros' },
            { id: 'cost', label: '€' },
            { id: 'consumption', label: 'L/100 km' }
          ].map((option) => {
            const isActive = mode === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onModeChange(option.id as Mode)}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-all ${
                  isActive ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {chartPoints.length === 0 ? (
        <div className="h-64 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 flex items-center justify-center text-xs text-slate-500">
          Sem dados suficientes para o gráfico.
        </div>
      ) : (
        <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/40 p-4 flex items-end gap-2">
          {chartPoints.map((point) => {
            const value = getSeriesValue(point, mode);
            const barHeight = maxValue > 0 ? Math.max((value / maxValue) * 100, 3) : 3;

            return (
              <div key={point.key} className="flex-1 flex flex-col justify-end items-center gap-2 group min-w-0">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-300 whitespace-nowrap">
                  {formatValue(value, mode)}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-sky-600/70 to-cyan-400/80 border border-sky-400/20"
                  style={{ height: `${barHeight}%` }}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{point.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
