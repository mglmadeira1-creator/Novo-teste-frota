import React from 'react';
import { ViaturaCompleta } from '../../types/viaturaCompleta';
import { Eye, MapPin, Gauge, Edit2, ShieldAlert } from 'lucide-react';

interface Props {
  viaturas: ViaturaCompleta[];
  onSelectViatura: (viatura: ViaturaCompleta) => void;
}

export const ViaturasListTable: React.FC<Props> = ({ viaturas, onSelectViatura }) => {
  const getEstadoBadge = (estado: ViaturaCompleta['estado_operacional']) => {
    switch (estado) {
      case 'em_marcha':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Em marcha
          </span>
        );
      case 'parado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Parado (Ignição ON)
          </span>
        );
      case 'ignicao_off':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Desligado
          </span>
        );
      case 'sem_sinal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Sem sinal
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Viatura / Matrícula</th>
              <th className="py-3.5 px-4">Motorista</th>
              <th className="py-3.5 px-4">TAG</th>
              <th className="py-3.5 px-4">Estado Telemático</th>
              <th className="py-3.5 px-4">ID Interno</th>
              <th className="py-3.5 px-4">Centro de Custo</th>
              <th className="py-3.5 px-4">Localização Atual (Cartrack)</th>
              <th className="py-3.5 px-4 text-right">Odómetro</th>
              <th className="py-3.5 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {viaturas.map((v) => (
              <tr key={v.cartrack_vehicle_id} className="hover:bg-slate-800/40 transition-colors group">
                {/* Matrícula / Modelo */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-center min-w-[70px]">
                      <span className="text-[9px] font-bold text-blue-400 block tracking-widest leading-none">P</span>
                      <span className="text-xs font-mono font-bold text-slate-100 leading-tight">{v.registration}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block text-xs">{v.make} {v.model}</span>
                      <span className="text-[10px] text-slate-400">ID Cartrack: {v.cartrack_vehicle_id}</span>
                    </div>
                  </div>
                </td>

                {/* Motorista */}
                <td className="py-3.5 px-4">
                  <span className="font-semibold text-slate-200 block text-xs">{v.motorista_nome}</span>
                  {v.motorista_id && (
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {v.motorista_id}</span>
                  )}
                </td>

                {/* TAG */}
                <td className="py-3.5 px-4">
                  {v.motorista_tag ? (
                    <span className="inline-flex items-center rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                      {v.motorista_tag}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">-</span>
                  )}
                </td>

                {/* Estado Telemático */}
                <td className="py-3.5 px-4">
                  {getEstadoBadge(v.estado_operacional)}
                  {v.speed > 0 && (
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">{v.speed} km/h</span>
                  )}
                </td>

                {/* ID Interno */}
                <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                  {v.admin?.id_interno || '-'}
                </td>

                {/* Centro de Custo */}
                <td className="py-3.5 px-4">
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-700/50">
                    {v.admin?.centro_custo || 'Geral'}
                  </span>
                </td>

                {/* Localização */}
                <td className="py-3.5 px-4 max-w-xs truncate">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate text-xs">{v.address}</span>
                  </div>
                </td>

                {/* Odómetro */}
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100">
                  {v.odometer_km ? v.odometer_km.toLocaleString('pt-PT') : '0'} <span className="text-[10px] text-slate-400 font-normal">km</span>
                </td>

                {/* Ações */}
                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => onSelectViatura(v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-lg transition-all font-medium text-xs shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
