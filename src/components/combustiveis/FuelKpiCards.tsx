import React from 'react';
import { Activity, Droplets, Euro, Fuel, TrendingDown, TrendingUp } from 'lucide-react';
import { FuelKpiSummary, FuelTrendDelta } from '../../types/combustivel';

interface Props {
  summary: FuelKpiSummary;
  trends: FuelTrendDelta;
  isLoading: boolean;
}

function formatLiters(value: number): string {
  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function formatPricePerLiter(value: number): string {
  return `${value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/L`;
}

function formatConsumption(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'N/D';
  }

  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L/100 km`;
}

function renderDelta(value: number | null): React.ReactNode {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-[10px] text-slate-500">Sem base comparativa</span>;
  }

  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-rose-400' : 'text-emerald-400';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

const skeleton = [1, 2, 3, 4, 5];

export const FuelKpiCards: React.FC<Props> = ({ summary, trends, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {skeleton.map((item) => (
          <div key={item} className="bg-slate-900 border border-slate-800 p-4 rounded-xl animate-pulse">
            <div className="h-3 w-20 bg-slate-800 rounded" />
            <div className="h-8 w-32 bg-slate-800 rounded mt-3" />
            <div className="h-3 w-24 bg-slate-800 rounded mt-3" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Consumo total',
      value: formatLiters(summary.totalLiters),
      icon: Droplets,
      delta: trends.totalLitersDeltaPct,
      accent: 'text-sky-400'
    },
    {
      title: 'Custo total',
      value: formatCurrency(summary.totalCost),
      icon: Euro,
      delta: trends.totalCostDeltaPct,
      accent: 'text-rose-400'
    },
    {
      title: 'Abastecimentos',
      value: summary.totalTransactions.toLocaleString('pt-PT'),
      icon: Fuel,
      delta: trends.totalTransactionsDeltaPct,
      accent: 'text-amber-400'
    },
    {
      title: 'Custo médio/L',
      value: formatPricePerLiter(summary.avgCostPerLiter),
      icon: Activity,
      delta: trends.avgCostPerLiterDeltaPct,
      accent: 'text-emerald-400'
    },
    {
      title: 'Consumo médio',
      value: formatConsumption(summary.avgConsumptionL100),
      icon: Activity,
      delta: trends.avgConsumptionDeltaPct,
      accent: 'text-violet-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.title} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">{card.title}</span>
              <Icon className={`w-4 h-4 ${card.accent}`} />
            </div>
            <span className={`text-2xl font-bold font-mono ${card.accent}`}>{card.value}</span>
            <div className="mt-2">{renderDelta(card.delta)}</div>
          </div>
        );
      })}
    </div>
  );
};
