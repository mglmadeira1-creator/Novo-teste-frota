import React from 'react';
import { MapPin, X } from 'lucide-react';
import { FuelTransaction } from '../../types/combustivel';

interface Props {
  transaction: FuelTransaction | null;
  onClose: () => void;
}

function formatDateTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('pt-PT'),
    time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function formatFuelLabel(type: FuelTransaction['fuel_type']): string {
  const labels: Record<FuelTransaction['fuel_type'], string> = {
    gasoleo: 'Gasóleo',
    gasolina: 'Gasolina',
    adblue: 'AdBlue',
    gpl: 'GPL',
    eletrico: 'Elétrico',
    outro: 'Outro'
  };

  return labels[type];
}

export const FuelTransactionDetails: React.FC<Props> = ({ transaction, onClose }) => {
  if (!transaction) {
    return null;
  }

  const { date, time } = formatDateTime(transaction.abastecimento_ts);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <header className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Detalhe do abastecimento</h3>
            <p className="text-[11px] text-slate-400">Registo completo da transação</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Info label="Data" value={date} />
          <Info label="Hora" value={time} />
          <Info label="Viatura" value={transaction.registration} />
          <Info label="Modelo" value={transaction.vehicle_model || 'N/D'} />
          <Info label="Motorista" value={transaction.driver_name} />
          <Info label="TAG" value={transaction.driver_tag || '-'} />
          <Info label="Tipo de combustível" value={formatFuelLabel(transaction.fuel_type)} />
          <Info label="Litros" value={`${transaction.liters.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`} />
          <Info label="Preço por litro" value={formatCurrency(transaction.price_per_liter)} />
          <Info label="Custo total" value={formatCurrency(transaction.total_cost)} />
          <Info label="Odómetro" value={transaction.odometer_km ? `${transaction.odometer_km.toLocaleString('pt-PT')} km` : 'N/D'} />
          <Info label="Posto" value={transaction.station_name || 'N/D'} />
          <Info label="Centro de custo" value={transaction.cost_center || 'N/D'} />
          <Info label="L/100 km" value={typeof transaction.consumption_l_per_100 === 'number' ? transaction.consumption_l_per_100.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : 'N/D'} />
        </div>

        <div className="px-5 pb-5">
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-300 mb-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold">Localização</span>
            </div>
            <p className="text-xs text-slate-400">{transaction.station_location || 'Sem localização associada ao abastecimento.'}</p>
          </div>
          {transaction.notes && (
            <div className="mt-3 bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Observações</span>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">{transaction.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-950/40 border border-slate-800 rounded-lg px-3 py-2">
    <span className="text-[11px] text-slate-400 block">{label}</span>
    <span className="text-xs text-slate-100 font-medium">{value}</span>
  </div>
);
