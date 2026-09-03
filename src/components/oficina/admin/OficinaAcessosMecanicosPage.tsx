import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Lock, LockOpen, RefreshCw, ShieldAlert, UserPlus } from 'lucide-react';
import { oficinaAdminService } from '../../../services/oficinaAdminService';
import { OficinaMecanicoAcesso, OficinaMecanicoEstado } from '../../../types/oficina';

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

function estadoClasses(estado: OficinaMecanicoEstado): string {
  if (estado === 'ativo') {
    return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20';
  }

  if (estado === 'bloqueado') {
    return 'bg-amber-500/15 text-amber-200 border-amber-400/20';
  }

  return 'bg-rose-500/15 text-rose-200 border-rose-400/20';
}

export const OficinaAcessosMecanicosPage: React.FC = () => {
  const [items, setItems] = useState<OficinaMecanicoAcesso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const [codigoNovo, setCodigoNovo] = useState('');
  const [ephemeralCode, setEphemeralCode] = useState<{ nome: string; codigo: string } | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [items]);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const list = await oficinaAdminService.listAcessos();
      setItems(list);
    } catch (err) {
      console.error('[Oficina][Admin] Falha ao listar acessos', err);
      setError('Nao foi possivel carregar os acessos dos mecanicos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nomeNovo.trim()) {
      setError('Nome do mecanico e obrigatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await oficinaAdminService.createMecanico(nomeNovo.trim(), codigoNovo.trim() || undefined);
      setNomeNovo('');
      setCodigoNovo('');
      setEphemeralCode({ nome: result.item.nome, codigo: result.generatedCode });
      await load();
    } catch (err) {
      console.error('[Oficina][Admin] Falha ao criar acesso', err);
      setError('Nao foi possivel criar o acesso do mecanico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEstado = async (acessoId: string, estado: OficinaMecanicoEstado) => {
    setError(null);
    try {
      await oficinaAdminService.setEstado(acessoId, estado);
      await load();
    } catch (err) {
      console.error('[Oficina][Admin] Falha a atualizar estado', err);
      setError('Nao foi possivel atualizar o estado do acesso.');
    }
  };

  const handleRegenerate = async (acesso: OficinaMecanicoAcesso) => {
    setError(null);
    try {
      const result = await oficinaAdminService.regenerateCodigo(acesso.id);
      setEphemeralCode({ nome: result.item.nome, codigo: result.generatedCode });
      await load();
    } catch (err) {
      console.error('[Oficina][Admin] Falha a regenerar codigo', err);
      setError('Nao foi possivel regenerar o codigo de acesso.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-slate-100">Oficina &gt; Acessos dos Mecanicos</h2>
        </div>
        <p className="text-xs text-slate-400">Criar, bloquear, desbloquear, revogar e regenerar codigos de acesso do Terminal Oficina.</p>

        {ephemeralCode && (
          <div className="mt-4 text-xs border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 rounded-lg px-3 py-2">
            Codigo criado/regenerado para {ephemeralCode.nome}: <strong>{ephemeralCode.codigo}</strong>. Guarda agora, porque nao sera exibido novamente.
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setEphemeralCode(null)}
            >
              Fechar
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 text-xs border border-rose-400/25 bg-rose-500/10 text-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-4 grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Nome do mecanico</span>
            <input
              value={nomeNovo}
              onChange={(event) => setNomeNovo(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Carlos"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Codigo (opcional, se vazio gera automatico)</span>
            <input
              value={codigoNovo}
              onChange={(event) => setCodigoNovo(event.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="OFI-4827"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? 'A criar...' : 'Criar acesso'}
          </button>
        </form>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100">Acessos de mecanicos</h3>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-400">A carregar acessos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-2 px-2">Nome</th>
                  <th className="py-2 px-2">Codigo</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Criado em</th>
                  <th className="py-2 px-2">Ultimo acesso</th>
                  <th className="py-2 px-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/70">
                    <td className="py-2 px-2 text-slate-200 font-medium">{item.nome}</td>
                    <td className="py-2 px-2 text-slate-300">{item.codigo_hint}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${estadoClasses(item.estado)}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{formatDate(item.created_at)}</td>
                    <td className="py-2 px-2 text-slate-400">{formatDate(item.ultimo_acesso_at)}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleRegenerate(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
                          title="Regenerar codigo"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerar
                        </button>

                        {item.estado !== 'ativo' && (
                          <button
                            onClick={() => handleEstado(item.id, 'ativo')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-700/70 border border-emerald-400/20 hover:bg-emerald-600 text-emerald-100"
                          >
                            <LockOpen className="w-3.5 h-3.5" />
                            Desbloquear
                          </button>
                        )}

                        {item.estado === 'ativo' && (
                          <button
                            onClick={() => handleEstado(item.id, 'bloqueado')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-700/70 border border-amber-400/20 hover:bg-amber-600 text-amber-100"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Bloquear
                          </button>
                        )}

                        {item.estado !== 'revogado' && (
                          <button
                            onClick={() => handleEstado(item.id, 'revogado')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-700/70 border border-rose-400/20 hover:bg-rose-600 text-rose-100"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Revogar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {sortedItems.length === 0 && (
                  <tr>
                    <td className="py-4 px-2 text-slate-400" colSpan={6}>
                      Nenhum acesso de mecanico criado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
