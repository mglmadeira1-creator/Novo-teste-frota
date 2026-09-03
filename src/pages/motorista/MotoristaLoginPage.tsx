import React, { useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { readMotoristaSession, writeMotoristaSession } from '../../auth/motoristaSession';

function normalizeCardInput(value: string): string {
  return value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
}

export const MotoristaLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [cardInput, setCardInput] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (readMotoristaSession()) {
      navigate('/motorista/painel', { replace: true });
      return;
    }

    if (readMotoristaSession()) {
      navigate('/motorista/painel', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const numeroCartao = normalizeCardInput(cardInput);
    if (!numeroCartao || !/^\d{4,8}$/.test(pin)) {
      setError('Introduz o número do cartão e um PIN de 4 a 8 dígitos.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: lookupError } = await supabase.functions.invoke('oficina-auth', {
        body: { action: 'login_motorista', numeroCartao, pin }
      });

      if (lookupError) {
        throw lookupError;
      }

      if (!data?.card || !data.token || !data.expiresAt) {
        throw new Error('Cartão ou PIN inválido.');
      }

      writeMotoristaSession({
        token: data.token,
        expiresAt: data.expiresAt,
        numeroCartao: data.card.numeroCartao,
        motoristaId: data.card.motoristaId || null,
        motoristaNome: data.card.motoristaNome || 'Motorista',
        qrTokenId: data.card.qrTokenId || null,
        estado: data.card.estado || 'ativo',
        loggedAt: new Date().toISOString()
      });

      navigate('/motorista/painel', { replace: true });
    } catch (err: any) {
      console.error('[Motorista][Login] Falha no login', err);
      setError(err?.message || 'Não foi possível validar este cartão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071b2e] text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(14,116,144,0.22),transparent_48%)]" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-slate-950/50">
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
            <div className="text-xs font-semibold text-cyan-300 uppercase tracking-[0.18em]">AlgarTempo</div>
            <h1 className="mt-2 text-2xl font-semibold">Motorista</h1>
            <p className="mt-1 text-xs text-slate-400">Acesso ao cartão de abastecimento</p>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">N.º do cartão</span>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardInput}
                  onChange={(event) => setCardInput(event.target.value)}
                  placeholder="1234 5678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-400">PIN do cartão</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="PIN de 4 a 8 dígitos"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm tracking-[0.25em] text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white rounded-lg transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'A autenticar...' : 'Entrar'}
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
