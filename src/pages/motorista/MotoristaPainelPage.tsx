import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { FuelCard } from '../../components/oficina/FuelCard';
import { readMotoristaSession } from '../../auth/motoristaSession';

interface MotoristaCartaoData {
  numeroCartao: string;
  motoristaNome: string;
  qrValue: string;
  estado: 'ativo' | 'bloqueado' | 'suspenso';
}

export const MotoristaPainelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cartao, setCartao] = useState<MotoristaCartaoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const motoristaSession = readMotoristaSession();
        if (!motoristaSession?.numeroCartao) {
          setError('Sessão do motorista inválida.');
          return;
        }

        setCartao({
          numeroCartao: motoristaSession.numeroCartao,
          estado: (motoristaSession.estado || 'ativo') as MotoristaCartaoData['estado'],
          motoristaNome: motoristaSession.motoristaNome || 'Motorista',
          qrValue: `FPCARD:${motoristaSession.qrTokenId}`,
        });
      } catch (err) {
        console.error('[Motorista][Painel] Falha ao carregar cartao', err);
        setError('Não foi possível carregar o teu cartão de abastecimento.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
            <div className="mx-auto w-full max-w-[760px] [perspective:1600px]">
              <button
                type="button"
                onClick={() => setIsFlipped((current) => !current)}
                aria-pressed={isFlipped}
                aria-label={isFlipped ? 'Mostrar frente do cartão' : 'Mostrar verso do cartão com QR code'}
                className="group relative block aspect-[1011/638] w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071b2e]"
              >
                <span
                  className="absolute inset-0 block transition-transform duration-500 [transform-style:preserve-3d]"
                  style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  <span className="absolute inset-0 block [backface-visibility:hidden]">
                    <FuelCard
                      motoristaNome={cartao.motoristaNome}
                      numeroCartao={cartao.numeroCartao}
                      className="h-full mx-auto"
                    />
                  </span>

                  <span className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center overflow-hidden rounded-[1.6rem] border border-slate-700 bg-slate-900 px-4 py-5 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.8)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-8 sm:py-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300 sm:text-xs">Cartão de abastecimento</span>
                    <span className="mt-3 rounded-xl bg-white p-3 shadow-xl sm:p-4">
                      <QRCode value={cartao.qrValue} size={qrcodeSize} />
                    </span>
                    <span className="mt-3 text-center text-xs text-slate-400">Apresente este código para abastecer</span>
                    {isBlocked && (
                      <span className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
                        Cartão {cartao.estado === 'bloqueado' ? 'bloqueado' : 'suspenso'}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              <p className="mt-3 text-center text-xs text-slate-500" aria-hidden="true">
                Toca no cartão para ver o QR code
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
