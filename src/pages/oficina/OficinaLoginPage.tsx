import React, { useState } from 'react';
import { LogIn, ShieldCheck, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOficinaSession } from '../../oficina/OficinaSessionProvider';

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('functionshttperror')) {
      return 'Nao foi possivel autenticar. Verifica o nome, o codigo e o estado do acesso.';
    }

    return error.message;
  }

  return 'Falha ao autenticar no Terminal Oficina.';
}

export const OficinaLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, autoLocked, clearAutoLocked } = useOficinaSession();
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError('Insere o nome do mecanico.');
      return;
    }

    if (!codigo.trim()) {
      setError('Insere o codigo de acesso do mecanico.');
      return;
    }

    setIsLoading(true);
    try {
      await login(nome, codigo);
      navigate('/oficina/terminal', { replace: true });
    } catch (err) {
      console.error('[Oficina][Login] Falha no login por codigo', err);
      setError(normalizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.18),transparent_42%),radial-gradient(circle_at_85%_70%,rgba(8,145,178,0.2),transparent_48%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-slate-950/60">
          <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-7 sm:px-8">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Wrench className="w-4 h-4" />
              Frota Pro Oficina
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Terminal Oficina</h1>
            <p className="mt-2 text-sm text-slate-400">Acesso seguro para a equipa de mecânicos</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-6 sm:p-8">
            {autoLocked && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
                Sessao terminada por inatividade. Volta a autenticar.
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={clearAutoLocked}
                >
                  Fechar aviso
                </button>
              </div>
            )}

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-300">Nome do mecânico</span>
              <input
                 value={nome}
                 onChange={(event) => setNome(event.target.value)}
                className="mt-1 min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Nome completo"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-300">Código de acesso</span>
              <input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                className="mt-1 min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base tracking-wider focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                placeholder="OFI-4827"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-14 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-base font-semibold shadow-lg shadow-cyan-950/30 hover:bg-cyan-500 disabled:opacity-60"
            >
              {isLoading ? <ShieldCheck className="w-4 h-4 animate-pulse" /> : <LogIn className="w-4 h-4" />}
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
