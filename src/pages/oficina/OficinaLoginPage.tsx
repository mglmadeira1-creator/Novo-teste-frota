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
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-slate-800 rounded-2xl bg-slate-900 shadow-2xl shadow-slate-950/50">
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
            <div className="inline-flex items-center gap-2 mb-2 text-cyan-300 text-xs font-semibold tracking-wide uppercase">
              <Wrench className="w-4 h-4" />
              Frota Pro Oficina
            </div>
            <h1 className="text-lg font-semibold">Terminal Oficina</h1>
             <p className="text-xs text-slate-400 mt-1">Acesso por nome e codigo de mecanico</p>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {autoLocked && (
              <div className="text-xs text-amber-200 bg-amber-500/15 border border-amber-500/25 rounded-lg px-3 py-2">
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
               <span className="text-xs text-slate-400">Nome do mecanico</span>
              <input
                 value={nome}
                 onChange={(event) => setNome(event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                 placeholder="Nome completo"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Codigo de acesso</span>
              <input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="OFI-4827"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60"
            >
              {isLoading ? <ShieldCheck className="w-4 h-4 animate-pulse" /> : <LogIn className="w-4 h-4" />}
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>

            {error && (
              <div className="text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
