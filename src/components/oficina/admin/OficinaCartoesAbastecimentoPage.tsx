import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, History, Lock, RefreshCw, ShieldAlert, Unlock, UserPlus } from 'lucide-react';
import { oficinaAdminService } from '../../../services/oficinaAdminService';
import { cartrackDirectoryService, CartrackMotoristaResumo, CartrackVeiculoResumo } from '../../../services/cartrackDirectoryService';
import { FuelCard } from '../FuelCard';
import {
  AcessoViaturasModo,
  CartaoAbastecimento,
  CartaoAbastecimentoEstado,
  CartaoHistoricoItem,
  OficinaMotoristaResumo
} from '../../../types/oficina';

function formatDate(value?: string | null): string {
  if (!value) {
    return 'N/D';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('pt-PT');
}

function estadoClasses(estado: CartaoAbastecimentoEstado): string {
  if (estado === 'ativo') {
    return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20';
  }

  if (estado === 'bloqueado') {
    return 'bg-rose-500/15 text-rose-200 border-rose-400/20';
  }

  return 'bg-amber-500/15 text-amber-200 border-amber-400/20';
}

export const OficinaCartoesAbastecimentoPage: React.FC = () => {
  const [cartoes, setCartoes] = useState<CartaoAbastecimento[]>([]);
  const [motoristas, setMotoristas] = useState<OficinaMotoristaResumo[]>([]);
  const [veiculos, setVeiculos] = useState<CartrackVeiculoResumo[]>([]);
  const [cartrackMotoristas, setCartrackMotoristas] = useState<CartrackMotoristaResumo[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [motoristaSelecionadoId, setMotoristaSelecionadoId] = useState('');
  const [novoCartaoPreview, setNovoCartaoPreview] = useState<CartaoAbastecimento | null>(null);

  const [novoMotoristaDriverId, setNovoMotoristaDriverId] = useState('');
  const [isCriandoMotorista, setIsCriandoMotorista] = useState(false);

  const [historicoCartaoId, setHistoricoCartaoId] = useState<string | null>(null);
  const [historicoItens, setHistoricoItens] = useState<CartaoHistoricoItem[]>([]);

  const [acessoMotoristaId, setAcessoMotoristaId] = useState('');
  const [acessoModo, setAcessoModo] = useState<AcessoViaturasModo>('todas');
  const [acessoVeiculoIds, setAcessoVeiculoIds] = useState<Set<string>>(new Set());
  const [isAcessoLoading, setIsAcessoLoading] = useState(false);

  const motoristasSemCartao = useMemo(() => {
    const comCartao = new Set(cartoes.map((c) => c.motorista_id).filter(Boolean));
    return motoristas.filter((m) => !comCartao.has(m.id));
  }, [cartoes, motoristas]);

  const motoristasCartrackDisponiveis = useMemo(() => {
    const jaImportados = new Set(motoristas.map((m) => m.external_driver_id).filter(Boolean));
    return cartrackMotoristas.filter((m) => !jaImportados.has(m.driver_id));
  }, [cartrackMotoristas, motoristas]);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cartoesList, motoristasList, veiculosList, cartrackMotoristasList] = await Promise.all([
        oficinaAdminService.listCartoes(),
        oficinaAdminService.listMotoristas(),
        cartrackDirectoryService.listVeiculos(),
        cartrackDirectoryService.listMotoristas()
      ]);

      setCartoes(cartoesList);
      setMotoristas(motoristasList);
      setVeiculos(veiculosList);
      setCartrackMotoristas(cartrackMotoristasList);
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha ao carregar dados', err);
      setError('Nao foi possivel carregar os cartoes de abastecimento e a frota Cartrack.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCartao = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!motoristaSelecionadoId) {
      setError('Seleciona um motorista para criar o cartao.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await oficinaAdminService.createCartao(motoristaSelecionadoId);
      setNovoCartaoPreview(result.item);
      setMotoristaSelecionadoId('');
      await load();
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha ao criar cartao', err);
      setError('Nao foi possivel criar o cartao de abastecimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMotorista = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const motorista = cartrackMotoristas.find((m) => m.driver_id === novoMotoristaDriverId);
    if (!motorista) {
      setError('Seleciona um motorista da Cartrack.');
      return;
    }

    setIsCriandoMotorista(true);
    try {
      const result = await oficinaAdminService.createMotorista(motorista.nome, motorista.driver_id);
      setNovoMotoristaDriverId('');
      setMotoristaSelecionadoId(result.item.id);
      await load();
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha ao importar motorista da Cartrack', err);
      setError('Nao foi possivel importar o motorista da Cartrack.');
    } finally {
      setIsCriandoMotorista(false);
    }
  };

  const handleEstado = async (cartaoId: string, estado: CartaoAbastecimentoEstado) => {
    setError(null);
    try {
      await oficinaAdminService.setCartaoEstado(cartaoId, estado);
      await load();
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha a atualizar estado', err);
      setError('Nao foi possivel atualizar o estado do cartao.');
    }
  };

  const handleRegenerate = async (cartaoId: string) => {
    setError(null);
    try {
      await oficinaAdminService.regenerateCartao(cartaoId);
      await load();
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha a regenerar cartao', err);
      setError('Nao foi possivel regenerar o cartao.');
    }
  };

  const handleVerHistorico = async (cartaoId: string) => {
    setHistoricoCartaoId(cartaoId);
    setHistoricoItens([]);
    try {
      const items = await oficinaAdminService.cartaoHistorico(cartaoId);
      setHistoricoItens(items);
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha a obter historico', err);
    }
  };

  const handleSelecionarMotoristaAcesso = async (motoristaId: string) => {
    setAcessoMotoristaId(motoristaId);
    setAcessoVeiculoIds(new Set());
    setAcessoModo('todas');

    if (!motoristaId) {
      return;
    }

    setIsAcessoLoading(true);
    try {
      const result = await oficinaAdminService.getMotoristaAcesso(motoristaId);
      setAcessoModo(result.modo);
      setAcessoVeiculoIds(new Set(result.veiculoIds));
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha a obter acesso a viaturas', err);
    } finally {
      setIsAcessoLoading(false);
    }
  };

  const toggleVeiculoAcesso = (vehicleId: string) => {
    setAcessoVeiculoIds((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const handleGuardarAcesso = async () => {
    if (!acessoMotoristaId) {
      return;
    }

    setError(null);
    try {
      await oficinaAdminService.setMotoristaAcesso(acessoMotoristaId, acessoModo, Array.from(acessoVeiculoIds));
      await load();
    } catch (err) {
      console.error('[Oficina][Cartoes] Falha a guardar acesso a viaturas', err);
      setError('Nao foi possivel guardar o acesso a viaturas.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-slate-100">Oficina &gt; Cartões de Abastecimento</h2>
        </div>
        <p className="text-xs text-slate-400">Cartão ALGARTEMPO do motorista — não fica ligado a uma matrícula, pode ser usado em qualquer viatura autorizada.</p>

        {error && (
          <div className="mt-4 text-xs border border-rose-400/25 bg-rose-500/10 text-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateCartao} className="mt-4 grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Motorista</span>
            <select
              value={motoristaSelecionadoId}
              onChange={(event) => setMotoristaSelecionadoId(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">Selecionar motorista sem cartao...</option>
              {motoristasSemCartao.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? 'A criar...' : 'Criar cartão'}
          </button>
        </form>

        <form onSubmit={handleCreateMotorista} className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Importar motorista da Cartrack (se ainda não existir)</span>
            <select
              value={novoMotoristaDriverId}
              onChange={(event) => setNovoMotoristaDriverId(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">Selecionar motorista da Cartrack...</option>
              {motoristasCartrackDisponiveis.map((m) => (
                <option key={m.driver_id} value={m.driver_id}>{m.nome}{m.driver_id_tag ? ` (${m.driver_id_tag})` : ''}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isCriandoMotorista}
            className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-sm font-semibold"
          >
            {isCriandoMotorista ? 'A importar...' : '+ Importar da Cartrack'}
          </button>
        </form>

        {novoCartaoPreview && (
          <div className="mt-5 flex flex-col sm:flex-row items-center gap-4 border border-cyan-400/20 bg-cyan-500/5 rounded-xl p-4">
            <FuelCard motoristaNome={novoCartaoPreview.motorista_nome} numeroCartao={novoCartaoPreview.numero_cartao} className="max-w-xs" />
            <div className="text-xs text-slate-300">
              <p>Cartão criado para <strong>{novoCartaoPreview.motorista_nome}</strong>.</p>
              <p className="mt-1 text-slate-400">N.º cartão: <span className="font-mono">{novoCartaoPreview.numero_cartao}</span></p>
              <button type="button" className="mt-2 underline text-cyan-300" onClick={() => setNovoCartaoPreview(null)}>Fechar</button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100">Cartões emitidos</h3>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-400">A carregar cartões...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-2 px-2">Motorista</th>
                  <th className="py-2 px-2">N.º Cartão</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Criado em</th>
                  <th className="py-2 px-2">Último abastecimento</th>
                  <th className="py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cartoes.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/70">
                    <td className="py-2 px-2 text-slate-200 font-medium">{item.motorista_nome}</td>
                    <td className="py-2 px-2 font-mono text-slate-300">{item.numero_cartao}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] ${estadoClasses(item.estado)}`}>{item.estado}</span>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{formatDate(item.created_at)}</td>
                    <td className="py-2 px-2 text-slate-400">{formatDate(item.ultimo_abastecimento_at)}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1.5">
                        {item.estado !== 'ativo' && (
                          <button onClick={() => handleEstado(item.id, 'ativo')} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-[11px]">
                            <Unlock className="w-3 h-3" /> Ativar
                          </button>
                        )}
                        {item.estado !== 'bloqueado' && (
                          <button onClick={() => handleEstado(item.id, 'bloqueado')} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/80 hover:bg-rose-500 text-[11px]">
                            <Lock className="w-3 h-3" /> Bloquear
                          </button>
                        )}
                        {item.estado !== 'suspenso' && (
                          <button onClick={() => handleEstado(item.id, 'suspenso')} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-600/80 hover:bg-amber-500 text-[11px]">
                            <ShieldAlert className="w-3 h-3" /> Suspender
                          </button>
                        )}
                        <button onClick={() => handleRegenerate(item.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-[11px]">
                          <RefreshCw className="w-3 h-3" /> Regenerar
                        </button>
                        <button onClick={() => handleVerHistorico(item.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-[11px]">
                          <History className="w-3 h-3" /> Histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cartoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 px-2 text-center text-slate-500">Nenhum cartão de abastecimento criado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {historicoCartaoId && (
          <div className="mt-4 border border-slate-800 rounded-xl p-4 bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-200">Histórico de utilização</h4>
              <button className="text-xs text-cyan-300 underline" onClick={() => setHistoricoCartaoId(null)}>Fechar</button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {historicoItens.length === 0 && <p className="text-xs text-slate-500">Sem abastecimentos registados para este cartão.</p>}
              {historicoItens.map((h) => (
                <div key={h.id} className="text-xs text-slate-300 border border-slate-800 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-slate-400">{formatDate(h.operacao_ts)}</span>
                  <span>{h.registration}</span>
                  <span>{h.fuel_type} · {h.litros} L</span>
                  <span>{h.quilometragem_km} km</span>
                  <span className="text-slate-500">Mecânico: {h.mecanico_nome_snapshot}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Acesso a viaturas por motorista</h3>
        <p className="text-xs text-slate-400 mb-4">Por omissão, o motorista pode abastecer qualquer viatura ativa da frota.</p>

        <label className="block space-y-1 max-w-sm">
          <span className="text-xs text-slate-400">Motorista</span>
          <select
            value={acessoMotoristaId}
            onChange={(event) => handleSelecionarMotoristaAcesso(event.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">Selecionar motorista...</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </label>

        {acessoMotoristaId && !isAcessoLoading && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={acessoModo === 'todas'} onChange={() => setAcessoModo('todas')} />
                Qualquer viatura da frota
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={acessoModo === 'restrito'} onChange={() => setAcessoModo('restrito')} />
                Apenas viaturas selecionadas
              </label>
            </div>

            {acessoModo === 'restrito' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto border border-slate-800 rounded-lg p-3">
                {veiculos.map((v) => (
                  <label key={v.cartrack_vehicle_id} className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={acessoVeiculoIds.has(v.cartrack_vehicle_id)}
                      onChange={() => toggleVeiculoAcesso(v.cartrack_vehicle_id)}
                    />
                    {v.cartrack_registration}{v.model && v.model !== 'N/D' ? ` (${v.model})` : ''}
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleGuardarAcesso}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold"
            >
              Guardar acesso a viaturas
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
