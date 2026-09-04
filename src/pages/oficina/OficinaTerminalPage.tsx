import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, LogOut, RefreshCcw, ShieldCheck, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOficinaSession } from '../../oficina/OficinaSessionProvider';
import { oficinaTerminalService } from '../../services/oficinaTerminalService';
import { CartaoResolveResult, OficinaAbastecimentoConfirmado, OficinaOperacaoRecente, OficinaViaturaItem } from '../../types/oficina';
import { QRCodeScanner } from '../../components/oficina/QRCodeScanner';

const fuelOptions = [
  { value: 'gasoleo', label: 'Gasóleo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'adblue', label: 'AdBlue' },
  { value: 'gpl', label: 'GPL' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'outro', label: 'Outro' }
];

type WizardStep = 'identificar' | 'viatura' | 'abastecimento' | 'confirmacao';

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('pt-PT');
}

function looksLikeQr(value: string): boolean {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(value);
}

function estadoLabel(estado?: string): string {
  if (estado === 'ativo') return 'Ativo';
  if (estado === 'bloqueado') return 'Bloqueado';
  if (estado === 'suspenso') return 'Suspenso';
  return estado || 'N/D';
}

export const OficinaTerminalPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, mecanico, terminal, logout } = useOficinaSession();

  const [step, setStep] = useState<WizardStep>('identificar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedInfo, setBlockedInfo] = useState<{ estado: string; motoristaNome: string } | null>(null);

  const [cartaoInput, setCartaoInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [resolved, setResolved] = useState<CartaoResolveResult | null>(null);

  const [viaturas, setViaturas] = useState<OficinaViaturaItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [buscaViatura, setBuscaViatura] = useState('');

  const [fuelType, setFuelType] = useState('gasoleo');
  const [litros, setLitros] = useState('');
  const [quilometragemKm, setQuilometragemKm] = useState('');

  const [confirmado, setConfirmado] = useState<OficinaAbastecimentoConfirmado | null>(null);
  const [recentes, setRecentes] = useState<OficinaOperacaoRecente[]>([]);

  const selectedVehicle = useMemo(
    () => viaturas.find((item) => item.cartrack_vehicle_id === selectedVehicleId),
    [viaturas, selectedVehicleId]
  );

  const viaturasFiltradas = useMemo(() => {
    const query = buscaViatura.trim().toLowerCase();
    if (!query) {
      return viaturas;
    }
    return viaturas.filter((v) => v.cartrack_registration.toLowerCase().includes(query));
  }, [viaturas, buscaViatura]);

  const refreshRecentes = async () => {
    if (!token) {
      return;
    }
    try {
      const list = await oficinaTerminalService.operacoesRecentes(token, 20);
      setRecentes(list);
    } catch (err) {
      console.error('[Oficina][Terminal] Falha ao carregar operacoes recentes', err);
    }
  };

  useEffect(() => {
    refreshRecentes();
  }, [token]);

  const handleLogout = async () => {
    await logout();
    navigate('/oficina/login', { replace: true });
  };

  const resetWizard = () => {
    setStep('identificar');
    setCartaoInput('');
    setPinInput('');
    setIsScannerOpen(false);
    setResolved(null);
    setBlockedInfo(null);
    setViaturas([]);
    setSelectedVehicleId('');
    setBuscaViatura('');
    setFuelType('gasoleo');
    setLitros('');
    setQuilometragemKm('');
    setConfirmado(null);
    setError(null);
  };

  const handleIdentificar = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token || !cartaoInput.trim() || !pinInput.trim()) {
      setError('Leia o QR Code e introduza o PIN do cartão.');
      return;
    }

    setError(null);
    setBlockedInfo(null);
    setIsSubmitting(true);

    try {
      const input = looksLikeQr(cartaoInput)
        ? { qrCode: cartaoInput.trim(), pin: pinInput.trim() }
        : { numeroCartao: cartaoInput.trim(), pin: pinInput.trim() };

      const result = await oficinaTerminalService.resolveCartao(token, input);
      setResolved(result);

      const vehicles = await oficinaTerminalService.listViaturas(token, result.motorista.id);
      setViaturas(vehicles);
      setStep('viatura');
    } catch (err) {
      const cartaoResult = (err as Error & { cartaoResult?: CartaoResolveResult }).cartaoResult;
      if (cartaoResult) {
        setBlockedInfo({ estado: cartaoResult.cartao.estado, motoristaNome: cartaoResult.motorista.nome });
        setError('Cartão não autorizado para abastecimento.');
      } else {
        console.error('[Oficina][Terminal] Falha ao identificar cartao', err);
        setError('Cartão não encontrado. Verifica o número ou o QR Code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQrScan = useCallback((value: string) => {
    setCartaoInput(value);
    setIsScannerOpen(false);
    setError(null);
  }, []);

  const handleSelecionarViatura = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = viaturas.find((item) => item.cartrack_vehicle_id === vehicleId);
    setQuilometragemKm(vehicle?.odometer_km ? String(Math.round(vehicle.odometer_km)) : '');
  };

  const handleAvancarParaAbastecimento = () => {
    if (!selectedVehicleId) {
      setError('Seleciona a viatura utilizada.');
      return;
    }
    setError(null);
    setStep('abastecimento');
  };

  const handleSubmitAbastecimento = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token || !resolved || !selectedVehicle) {
      return;
    }

    const litrosNumber = Number(litros.replace(',', '.'));
    const kmsNumber = Number(quilometragemKm.replace(',', '.'));

    if (!Number.isFinite(litrosNumber) || litrosNumber <= 0 || !Number.isFinite(kmsNumber) || kmsNumber <= 0) {
      setError('Litros e quilometragem devem ser números positivos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const operacao = await oficinaTerminalService.registarAbastecimento(token, {
        motoristaId: resolved.motorista.id,
        motoristaNomeSnapshot: resolved.motorista.nome,
        motoristaQrCodigo: cartaoInput.trim(),
        cartaoId: resolved.cartao.id,
        cartrackVehicleId: selectedVehicle.cartrack_vehicle_id,
        registration: selectedVehicle.cartrack_registration,
        fuelType,
        litros: litrosNumber,
        quilometragemKm: Math.round(kmsNumber)
      });

      setConfirmado(operacao);
      setStep('confirmacao');
      await refreshRecentes();
    } catch (err) {
      console.error('[Oficina][Terminal] Falha ao registar abastecimento', err);
      setError('Não foi possível registar o abastecimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.12),transparent_34%),#020617] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-slate-950/90 shadow-lg shadow-slate-950/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <Wrench className="w-4 h-4" />
              Frota Pro · Oficina
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Mecânico: <span className="text-slate-200">{mecanico?.nome || 'N/D'}</span> | Terminal: <span className="text-slate-200">{terminal?.nome || 'N/D'}</span>
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              onClick={refreshRecentes}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm hover:bg-slate-700 sm:flex-none"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-600/80 px-4 text-sm hover:bg-rose-500 sm:flex-none"
            >
              <LogOut className="w-3.5 h-3.5" />
              Trocar mecânico
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 p-3 sm:p-5 lg:p-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl shadow-slate-950/20 sm:p-7">
          {error && (
            <div className="mb-5 rounded-xl border border-rose-500/25 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {step === 'identificar' && (
            <form onSubmit={handleIdentificar} className="space-y-4">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Passo 1 de 3</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-100">Identificar cartão</h2>
                  <p className="mt-1 text-sm text-slate-400">Leia o QR Code e confirme com o PIN do cartão.</p>
                </div>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">Entrada</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 space-y-1">
                <span className="text-xs text-slate-400">QR Code do cartão</span>
                <input
                  autoFocus
                  value={cartaoInput}
                  readOnly
                  onChange={(event) => setCartaoInput(event.target.value)}
                  className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-lg font-mono tracking-wider text-cyan-200 focus:outline-none"
                  placeholder="Leia o QR Code no cartão"
                />
                </label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen((current) => !current)}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 text-base font-semibold text-cyan-200 hover:bg-cyan-400/20"
                >
                  <Camera className="h-5 w-5" />
                  {isScannerOpen ? 'Fechar leitor' : 'Ler QR Code'}
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-slate-400">PIN do cartão</span>
                <input
                  inputMode="numeric"
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-lg tracking-[0.35em] focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="PIN de 4 a 8 dígitos"
                />
              </label>

              {isScannerOpen && <QRCodeScanner onScan={handleQrScan} onClose={() => setIsScannerOpen(false)} />}

              {blockedInfo && (
                <div className="border border-amber-400/25 bg-amber-500/10 rounded-lg p-3 text-xs text-amber-200">
                  <p className="font-semibold">MOTORISTA: {blockedInfo.motoristaNome}</p>
                  <p>ESTADO: {estadoLabel(blockedInfo.estado)}</p>
                  <p className="mt-1">Cartão não autorizado para abastecimento.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-14 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-base font-semibold shadow-lg shadow-cyan-950/30 hover:bg-cyan-500 disabled:opacity-60"
              >
                {isSubmitting ? 'A identificar...' : 'Identificar cartão'}
              </button>
            </form>
          )}

          {step === 'viatura' && resolved && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Passo 2 de 3</p>
                <h2 className="mt-1 text-xl font-semibold">Selecionar viatura</h2>
              </div>

              <div className="border border-emerald-400/20 bg-emerald-500/10 rounded-lg p-3 text-xs text-emerald-200">
                <p className="font-semibold">MOTORISTA: {resolved.motorista.nome}</p>
                <p>CARTÃO: {resolved.cartao.numeroCartao}</p>
                <p>ESTADO: {estadoLabel(resolved.cartao.estado)}</p>
              </div>

              <input
                value={buscaViatura}
                onChange={(event) => setBuscaViatura(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Pesquisar por matrícula..."
              />

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {viaturasFiltradas.map((v) => (
                  <button
                    key={v.cartrack_vehicle_id}
                    type="button"
                    onClick={() => handleSelecionarViatura(v.cartrack_vehicle_id)}
                    className={`min-h-14 w-full rounded-xl border px-4 text-left text-base ${selectedVehicleId === v.cartrack_vehicle_id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
                  >
                    <span className="block font-semibold">{v.cartrack_registration}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {v.odometer_km ? `${Math.round(v.odometer_km).toLocaleString('pt-PT')} km Cartrack` : 'Odómetro Cartrack indisponível'}
                    </span>
                  </button>
                ))}
                {viaturasFiltradas.length === 0 && (
                  <p className="text-xs text-slate-500">Nenhuma viatura disponível para este motorista.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={resetWizard} className="min-h-12 rounded-xl bg-slate-800 px-5 text-sm hover:bg-slate-700">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAvancarParaAbastecimento}
                  className="min-h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-base font-semibold hover:bg-cyan-500"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 'abastecimento' && resolved && selectedVehicle && (
            <form onSubmit={handleSubmitAbastecimento} className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Passo 3 de 3</p>
                <h2 className="mt-1 text-xl font-semibold">Registar abastecimento</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <p>Motorista<br /><span className="text-slate-100 font-semibold">{resolved.motorista.nome}</span></p>
                <p>Cartão<br /><span className="text-slate-100 font-mono">{resolved.cartao.numeroCartao}</span></p>
                <p>Viatura<br /><span className="text-slate-100 font-semibold">{selectedVehicle.cartrack_registration}</span></p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Combustível</span>
                  <select
                    value={fuelType}
                    onChange={(event) => setFuelType(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  >
                    {fuelOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Litros</span>
                  <input
                    value={litros}
                    onChange={(event) => setLitros(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="45,20"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-slate-400">Quilometragem atual (Cartrack)</span>
                  <input
                    value={quilometragemKm}
                    readOnly
                    className="min-h-12 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 text-base font-semibold text-emerald-200 focus:outline-none"
                    placeholder="A carregar da Cartrack..."
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('viatura')} className="min-h-12 rounded-xl bg-slate-800 px-5 text-sm hover:bg-slate-700">
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-semibold shadow-lg shadow-emerald-950/30 hover:bg-emerald-500 disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting ? 'A registar...' : 'Registar abastecimento'}
                </button>
              </div>
            </form>
          )}

          {step === 'confirmacao' && confirmado && (
            <div className="space-y-4 text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-emerald-300">ABASTECIMENTO REGISTADO</h2>

              <div className="text-left text-sm text-slate-300 max-w-sm mx-auto space-y-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <p>Motorista:<br /><span className="text-slate-100 font-semibold">{confirmado.motoristaNomeSnapshot}</span></p>
                <p>Viatura:<br /><span className="text-slate-100 font-semibold">{confirmado.registration}</span></p>
                <p>Combustível:<br /><span className="text-slate-100 font-semibold capitalize">{confirmado.fuelType}</span></p>
                <p>Litros:<br /><span className="text-slate-100 font-semibold">{confirmado.litros.toFixed(2)} L</span></p>
                <p>Quilometragem:<br /><span className="text-slate-100 font-semibold">{confirmado.quilometragemKm.toLocaleString('pt-PT')} km</span></p>
                <p>Data/hora:<br /><span className="text-slate-100 font-semibold">{formatDateTime(confirmado.operacao_ts)}</span></p>
                <p>Mecânico:<br /><span className="text-slate-100 font-semibold">{confirmado.mecanicoNome}</span></p>
                <p>Oficina:<br /><span className="text-slate-100 font-semibold">{confirmado.terminalNome}</span></p>
              </div>

              <button
                onClick={resetWizard}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500"
              >
                NOVO ABASTECIMENTO
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Atividade</p>
              <h2 className="mt-1 text-lg font-semibold">Operações recentes</h2>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Últimas 20</span>
          </div>

          <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto pr-1">
            {recentes.length === 0 && <div className="text-xs text-slate-400">Sem operações registadas.</div>}
            {recentes.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-cyan-300 font-semibold">{item.registration}</span>
                  <span className="text-[11px] text-slate-400">{formatDateTime(item.operacao_ts)}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">Motorista: {item.motorista_nome_snapshot}</p>
                <p className="text-xs text-slate-300">Mecânico: {item.mecanico_nome_snapshot}</p>
                <p className="text-xs text-slate-300">{item.fuel_type} | {item.litros} L | {item.quilometragem_km} km</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

