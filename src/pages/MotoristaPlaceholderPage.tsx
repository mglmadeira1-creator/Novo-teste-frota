import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { FuelCard } from '../components/oficina/FuelCard';

interface MeuCartaoData {
  numeroCartao: string;
  estado: 'ativo' | 'bloqueado' | 'suspenso';
  motoristaNome: string;
  qrValue: string;
}

export const MotoristaPlaceholderPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cartao, setCartao] = useState<MeuCartaoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError('Sessao invalida.');
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
          motoristaNome: motorista?.nome || 'Motorista',
          qrValue: `FPCARD:${data.qr_token_id}`
        });
      } catch (err) {
        console.error('[Motorista][MeuCartao] Falha ao carregar cartao', err);
        setError('Nao foi possivel carregar o teu cartao de abastecimento.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#071b2e] text-slate-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-10">
      <div className="w-full max-w-[1100px] flex justify-center">
        {loading && <p className="text-xs text-slate-300 text-center">A carregar cartão...</p>}

        {!loading && error && (
          <div className="max-w-md mx-auto border border-rose-400/25 bg-rose-500/10 text-rose-200 rounded-lg p-3 text-xs flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && !cartao && (
          <div className="max-w-md mx-auto border border-slate-800 rounded-2xl bg-slate-900 p-6 text-center">
            <p className="text-sm text-slate-300">Ainda não tens um cartão de abastecimento associado.</p>
            <p className="text-xs text-slate-500 mt-2">Contacta o administrador para o criar em Oficina &gt; Cartões de Abastecimento.</p>
          </div>
        )}

        {!loading && cartao && (
          <>
            <FuelCard motoristaNome={cartao.motoristaNome} numeroCartao={cartao.numeroCartao} qrValue={cartao.qrValue} className="mx-auto" />
            {cartao.estado !== 'ativo' && (
              <div className="max-w-md mx-auto mt-4 border border-amber-400/25 bg-amber-500/10 text-amber-200 rounded-lg p-3 text-xs text-center">
                Cartão {cartao.estado === 'bloqueado' ? 'bloqueado' : 'suspenso'} — não pode ser utilizado para abastecimento.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
