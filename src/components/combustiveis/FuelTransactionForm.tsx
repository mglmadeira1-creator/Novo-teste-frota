import React, { useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { CreateFuelTransactionInput, FuelType, FuelVehicleDirectoryItem } from '../../types/combustivel';

interface Props {
  open: boolean;
  vehicles: FuelVehicleDirectoryItem[];
  onClose: () => void;
  onSubmit: (payload: CreateFuelTransactionInput) => Promise<void>;
}

interface FormState {
  cartrack_vehicle_id: string;
  registration: string;
  vehicle_model: string;
  motorista_id: string;
  motorista_nome_snapshot: string;
  tag_codigo_snapshot: string;
  date: string;
  time: string;
  fuel_type: FuelType;
  liters: string;
  price_per_liter: string;
  odometer_km: string;
  station_name: string;
  station_location: string;
  cost_center: string;
  notes: string;
}

function nowDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function initialState(): FormState {
  return {
    cartrack_vehicle_id: '',
    registration: '',
    vehicle_model: '',
    motorista_id: '',
    motorista_nome_snapshot: '',
    tag_codigo_snapshot: '',
    date: nowDate(),
    time: nowTime(),
    fuel_type: 'gasoleo',
    liters: '',
    price_per_liter: '',
    odometer_km: '',
    station_name: '',
    station_location: '',
    cost_center: '',
    notes: ''
  };
}

function fuelLabel(type: FuelType): string {
  const labels: Record<FuelType, string> = {
    gasoleo: 'Gasóleo',
    gasolina: 'Gasolina',
    adblue: 'AdBlue',
    gpl: 'GPL',
    eletrico: 'Elétrico',
    outro: 'Outro'
  };
  return labels[type];
}

export const FuelTransactionForm: React.FC<Props> = ({ open, vehicles, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(initialState());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    const liters = Number(form.liters);
    const price = Number(form.price_per_liter);
    if (!Number.isFinite(liters) || !Number.isFinite(price)) {
      return 0;
    }
    return liters * price;
  }, [form.liters, form.price_per_liter]);

  if (!open) {
    return null;
  }

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find((item) => item.cartrack_vehicle_id === vehicleId);
    if (!vehicle) {
      setForm((current) => ({ ...current, cartrack_vehicle_id: vehicleId }));
      return;
    }

    setForm((current) => ({
      ...current,
      cartrack_vehicle_id: vehicle.cartrack_vehicle_id,
      registration: vehicle.registration,
      vehicle_model: vehicle.model,
      motorista_id: vehicle.suggested_driver_id || current.motorista_id,
      motorista_nome_snapshot: vehicle.suggested_driver_name || current.motorista_nome_snapshot,
      tag_codigo_snapshot: vehicle.suggested_tag || current.tag_codigo_snapshot
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.cartrack_vehicle_id || !form.registration) {
      setError('Seleciona uma viatura válida para registar o abastecimento.');
      return;
    }

    if (!form.date || !form.time) {
      setError('Data e hora são obrigatórias.');
      return;
    }

    const liters = Number(form.liters);
    const pricePerLiter = Number(form.price_per_liter);
    if (!Number.isFinite(liters) || liters <= 0 || !Number.isFinite(pricePerLiter) || pricePerLiter < 0) {
      setError('Litros e preço por litro devem ter valores válidos.');
      return;
    }

    const payload: CreateFuelTransactionInput = {
      abastecimento_ts: new Date(`${form.date}T${form.time}:00`).toISOString(),
      cartrack_vehicle_id: form.cartrack_vehicle_id,
      registration: form.registration,
      vehicle_model: form.vehicle_model || undefined,
      motorista_id: form.motorista_id || undefined,
      motorista_nome_snapshot: form.motorista_nome_snapshot || undefined,
      tag_codigo_snapshot: form.tag_codigo_snapshot || undefined,
      fuel_type: form.fuel_type,
      liters,
      price_per_liter: pricePerLiter,
      total_cost: total,
      odometer_km: form.odometer_km ? Number(form.odometer_km) : undefined,
      station_name: form.station_name || undefined,
      station_location: form.station_location || undefined,
      cost_center: form.cost_center || undefined,
      notes: form.notes || undefined
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);
      setForm(initialState());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar abastecimento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <header className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Novo abastecimento</h3>
            <p className="text-[11px] text-slate-400">Registo manual com cálculo automático do total</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Field label="Viatura">
              <select
                value={form.cartrack_vehicle_id}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Selecionar viatura</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.cartrack_vehicle_id} value={vehicle.cartrack_vehicle_id}>
                    {vehicle.registration} · {vehicle.model}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Matrícula">
              <input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Modelo">
              <input value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Tipo de combustível">
              <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value as FuelType })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500">
                {(['gasoleo', 'gasolina', 'adblue', 'gpl', 'eletrico', 'outro'] as FuelType[]).map((type) => (
                  <option key={type} value={type}>{fuelLabel(type)}</option>
                ))}
              </select>
            </Field>

            <Field label="Motorista">
              <input value={form.motorista_nome_snapshot} onChange={(e) => setForm({ ...form, motorista_nome_snapshot: e.target.value })} placeholder="Motorista não registado" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="TAG">
              <input value={form.tag_codigo_snapshot} onChange={(e) => setForm({ ...form, tag_codigo_snapshot: e.target.value })} placeholder="Ex: TAG-001" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Data">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Hora">
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>

            <Field label="Litros">
              <input type="number" min={0} step="0.01" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Preço por litro">
              <input type="number" min={0} step="0.001" value={form.price_per_liter} onChange={(e) => setForm({ ...form, price_per_liter: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Odómetro">
              <input type="number" min={0} step="1" value={form.odometer_km} onChange={(e) => setForm({ ...form, odometer_km: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Posto">
              <input value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>

            <Field label="Localização do posto">
              <input value={form.station_location} onChange={(e) => setForm({ ...form, station_location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="Centro de custo">
              <input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <Field label="ID motorista (Cartrack)">
              <input value={form.motorista_id} onChange={(e) => setForm({ ...form, motorista_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
            </Field>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 flex flex-col justify-center">
              <span className="text-[11px] text-slate-400">Total (automático)</span>
              <span className="text-lg font-bold font-mono text-emerald-300">{total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>

          <Field label="Observações">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </Field>

          {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700">Cancelar</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white rounded-lg">
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'A guardar...' : 'Guardar abastecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-1 block">
    <span className="text-[11px] text-slate-400">{label}</span>
    {children}
  </label>
);
