import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../api/supabaseClient';
import { FuelCard } from '../../components/oficina/FuelCard';

interface MotoristaCartaoData {
  numeroCartao: string;
  motoristaNome: string;
  qrValue: string;
  estado: 'ativo' | 'bloqueado' | 'suspenso';
}

export const MotoristaPainelPage: React.FC = () => {
  const { user, userName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartao, setCartao] = useState<MotoristaCartaoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError('Sessão inválida.');
          return;
        }

        const { data, error: queryError } = await supabase
          .from('combustivel_motorista_cartoes')
          .select('numero_cartao, estado, qr_token_id, motorista:combustivel_motoristas(nome)')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          setCartao(null);
          return;
        }

        const motorista = Array.isArray(data.motorista) ? data.motorista[0] : data.motorista;

        setCartao({
          numeroCartao: data.numero_cartao,
          estado: data.estado,
          motoristaNome: motorista?.nome || userName || user?.email?.split('@')[0] || 'Motorista',
          qrValue: `FPCARD:${data.qr_token_id}`,
        });
      } catch (err) {
        console.error('[Motorista][Painel] Falha ao carregar cartao', err);
        setError('Não foi possível carregar o teu cartão de abastecimento.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, userName]);

  const isBlocked = cartao?.estado && cartao.estado !== 'ativo';

  const qrcodeSize = useMemo(() => {
    if (typeof window === 'undefined') return 120;
    return Math.min(window.innerWidth * 0.22, 150);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071b2e] flex items-center justify-center text-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">A carregar o teu cartão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071b2e] text-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {!error && !cartao && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-300">
            Ainda não tens um cartão de abastecimento associado.
          </div>
        )}

        {!error && cartao && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-2 sm:p-3 shadow-[0_20px_45px_-25px_rgba(56,189,248,0.35)]">
              <FuelCard
                motoristaNome={cartao.motoristaNome}
                numeroCartao={cartao.numeroCartao}
                className="mx-auto"
              />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Motorista</div>
                  <div className="mt-1 text-lg font-semibold text-slate-100">{cartao.motoristaNome}</div>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-md">
                  <QRCode value={cartao.qrValue} size={qrcodeSize} />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">N.º do cartão</div>
                <div className="mt-1 text-base font-semibold tracking-[0.12em] text-cyan-300">{cartao.numeroCartao}</div>
              </div>

              {isBlocked && (
                <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Cartão {cartao.estado === 'bloqueado' ? 'bloqueado' : 'suspenso'} — não pode ser utilizado para abastecimento.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
