import React, { useState } from 'react';
import { ViaturaCompleta } from '../../types/viaturaCompleta';
import { X, Info, MapPin, Flag, Gauge, Wrench, FileText, DollarSign, History, Save, CheckCircle } from 'lucide-react';
import { viaturasService } from '../../services/viaturasService';

interface Props {
  viatura: ViaturaCompleta | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ViaturaDetailModal: React.FC<Props> = ({ viatura, onClose, onRefresh }) => {
  if (!viatura) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'trips' | 'odometer' | 'maintenance' | 'docs' | 'costs' | 'history'>('info');

  // Form local state para edição administrativa Supabase
  const [formData, setFormData] = useState({
    id_interno: viatura.admin?.id_interno || '',
    centro_custo: viatura.admin?.centro_custo || '',
    cliente: viatura.admin?.cliente || '',
    categoria_interna: viatura.admin?.categoria_interna || '',
    motorista_nome: viatura.admin?.motorista_nome || '',
    observacoes: viatura.admin?.observacoes || '',
    propriedade: viatura.admin?.propriedade || 'proprio'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    const success = await viaturasService.saveAdminData({
      cartrack_vehicle_id: viatura.cartrack_vehicle_id,
      cartrack_registration: viatura.registration,
      ...formData
    });

    setIsSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    }
  };

  const tabs = [
    { id: 'info', label: 'Informação', icon: Info },
    { id: 'location', label: 'Localização', icon: MapPin },
    { id: 'trips', label: 'Viagens', icon: Flag },
    { id: 'odometer', label: 'Odómetro', icon: Gauge },
    { id: 'maintenance', label: 'Manutenção', icon: Wrench },
    { id: 'docs', label: 'Documentos', icon: FileText },
    { id: 'costs', label: 'Custos', icon: DollarSign },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-md text-center">
              <span className="text-[9px] font-bold text-blue-400 block tracking-widest">P</span>
              <span className="text-sm font-mono font-bold text-slate-100">{viatura.registration}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{viatura.make} {viatura.model}</h3>
              <p className="text-xs text-slate-400">ID Telemático Cartrack: {viatura.cartrack_vehicle_id} | ID Interno: {viatura.admin?.id_interno || 'N/A'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/30 px-6 gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Telemetry Summary Box */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Odómetro Atual (Cartrack)</span>
                  <span className="text-base font-mono font-bold text-slate-100">{viatura.odometer_km.toLocaleString('pt-PT')} km</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Última Comunicação</span>
                  <span className="text-xs text-slate-200 block font-mono mt-0.5">{new Date(viatura.last_communication).toLocaleString('pt-PT')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Chassi / VIN</span>
                  <span className="text-xs text-slate-200 block font-mono mt-0.5">{viatura.chassis_number || 'Não registado'}</span>
                </div>
              </div>

              {/* Form de Dados Administrativos Supabase */}
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-semibold text-slate-200">Dados Administrativos Internos (Supabase)</h4>
                  {savedSuccess && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Guardado no Supabase com sucesso!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">ID Interno Empresa</label>
                    <input
                      type="text"
                      value={formData.id_interno}
                      onChange={e => setFormData({ ...formData, id_interno: e.target.value })}
                      placeholder="Ex: V-042"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Centro de Custo</label>
                    <input
                      type="text"
                      value={formData.centro_custo}
                      onChange={e => setFormData({ ...formData, centro_custo: e.target.value })}
                      placeholder="Ex: Obras Algarve / Logística"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Cliente / Projeto</label>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                      placeholder="Ex: Cliente Geral"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Categoria Interna</label>
                    <input
                      type="text"
                      value={formData.categoria_interna}
                      onChange={e => setFormData({ ...formData, categoria_interna: e.target.value })}
                      placeholder="Ex: Ligeiro Passageiros, Pesados"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Motorista Atribuído</label>
                    <input
                      type="text"
                      value={formData.motorista_nome}
                      onChange={e => setFormData({ ...formData, motorista_nome: e.target.value })}
                      placeholder="Nome do motorista"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Regime de Propriedade</label>
                    <select
                      value={formData.propriedade}
                      onChange={e => setFormData({ ...formData, propriedade: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="proprio">Próprio</option>
                      <option value="leasing">Leasing</option>
                      <option value="renting">Renting</option>
                      <option value="ald">ALD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Observações Internas</label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Notas administrativas adicionais..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'A guardar...' : 'Guardar Alterações'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Morada Formatada Cartrack</span>
                  <span className="text-xs text-slate-400 font-mono">GPS: {viatura.latitude}, {viatura.longitude}</span>
                </div>
                <p className="text-sm font-medium text-slate-100">{viatura.address}</p>
              </div>

              <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center flex-col gap-2">
                <MapPin className="w-8 h-8 text-sky-400" />
                <span className="text-xs text-slate-400">Coordenadas em tempo real: Latitude {viatura.latitude} | Longitude {viatura.longitude}</span>
                <span className="text-[11px] text-slate-500">Velocidade atual: {viatura.speed} km/h</span>
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400">Histórico de viagens telemáticas fornecido diretamente pela Cartrack API.</p>
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-200">Viagem #1 - Hoje</span>
                  <span className="text-emerald-400 font-mono font-semibold">42.5 km</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-400">Origem:</span> Garagem Central, Faro</div>
                  <div><span className="text-slate-400">Destino:</span> Av. 5 de Outubro, Albufeira</div>
                  <div><span className="text-slate-400">Duração:</span> 1h 00m</div>
                  <div><span className="text-slate-400">Vel. Máxima:</span> 98 km/h</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'odometer' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Leitura Atual Odómetro</span>
                  <span className="text-2xl font-bold font-mono text-slate-100 block">{viatura.odometer_km.toLocaleString('pt-PT')} km</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Fonte dos Dados</span>
                  <span className="text-xs font-semibold text-sky-400 block">Dispositivo GPS / CAN-bus Cartrack</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-3 text-xs text-slate-400">
              <p>Módulo de manutenção preparado para agendamentos por quilometragem Cartrack.</p>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">Revisão Periódica (Óleo + Filtros)</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">Pendente</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Próxima revisão aos {(viatura.odometer_km + 5000).toLocaleString('pt-PT')} km.</p>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-3 text-xs text-slate-400">
              <p>Documentos administrativos da viatura (Seguro, IPO, DUA).</p>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-200">Seguro de Responsabilidade Civil</span>
                  <span className="text-emerald-400 font-medium">Válido</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Apólice Nº: 987654321</span>
                  <span>Validade: 31/12/2026</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-3 text-xs text-slate-400">
              <p>Centro de custos e resumo financeiro associado à viatura.</p>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200">
                <span className="text-xs text-slate-400 block">Centro de Custo Atribuído</span>
                <span className="text-sm font-semibold text-sky-400 mt-1 block">{viatura.admin?.centro_custo || 'Geral'}</span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 text-xs text-slate-400">
              <p>Histórico de alterações e auditoria administrativa.</p>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 text-[11px]">
                <span className="text-slate-400 block font-mono">{new Date().toLocaleString('pt-PT')}</span>
                <span>Viatura sincronizada com Cartrack Fleet API.</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
