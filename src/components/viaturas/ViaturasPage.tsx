import React, { useState, useEffect } from 'react';
import { ViaturaCompleta } from '../../types/viaturaCompleta';
import { viaturasService } from '../../services/viaturasService';
import { ViaturasListTable } from '../layout/ViaturasListTable';
import { ViaturaDetailModal } from './ViaturaDetailModal';
import { Truck, Search, Filter, ShieldCheck, Activity, AlertTriangle, Radio } from 'lucide-react';

export const ViaturasPage: React.FC = () => {
  const [viaturas, setViaturas] = useState<ViaturaCompleta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViatura, setSelectedViatura] = useState<ViaturaCompleta | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  const loadData = async () => {
    setIsLoading(true);
    const data = await viaturasService.getViaturas();
    setViaturas(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Métricas
  const total = viaturas.length;
  const emMarcha = viaturas.filter(v => v.estado_operacional === 'em_marcha').length;
  const parados = viaturas.filter(v => v.estado_operacional === 'parado').length;
  const desligados = viaturas.filter(v => v.estado_operacional === 'ignicao_off').length;
  const semSinal = viaturas.filter(v => v.estado_operacional === 'sem_sinal').length;

  // Filtro
  const viaturasFiltradas = viaturas.filter(v => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      v.registration.toLowerCase().includes(query) ||
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      (v.admin?.id_interno && v.admin.id_interno.toLowerCase().includes(query)) ||
      (v.admin?.centro_custo && v.admin.centro_custo.toLowerCase().includes(query));

    const matchesEstado =
      estadoFilter === 'todos' || v.estado_operacional === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Bar */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Viaturas</span>
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-bold text-slate-100 font-mono">{total}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Em Marcha</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{emMarcha}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Paradas (ON)</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold text-amber-400 font-mono">{parados}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Desligadas</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-300 font-mono">{desligados}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Sem Sinal</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-2xl font-bold text-rose-400 font-mono">{semSinal}</span>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar por matrícula, modelo, ID interno ou centro de custo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="todos">Todos os Estados</option>
              <option value="em_marcha">Em Marcha</option>
              <option value="parado">Parados (Ignição ON)</option>
              <option value="ignicao_off">Ignição OFF</option>
              <option value="sem_sinal">Sem Sinal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs">A carregar dados telemáticos da Cartrack...</span>
        </div>
      ) : (
        <ViaturasListTable
          viaturas={viaturasFiltradas}
          onSelectViatura={setSelectedViatura}
        />
      )}

      {/* Detail Modal */}
      <ViaturaDetailModal
        viatura={selectedViatura}
        onClose={() => setSelectedViatura(null)}
        onRefresh={loadData}
      />
    </div>
  );
};
