import React from 'react';
import { Fuel } from 'lucide-react';

interface FuelCardProps {
  motoristaNome: string;
  numeroCartao: string;
  qrValue?: string;
  className?: string;
}

/** Marca gráfica ALGARTEMPO aproximada com dois "A" sobrepostos em gradiente azul/ciano. */
const AlgarTempoMark: React.FC = () => (
  <svg viewBox="0 0 48 40" className="w-10 h-9" aria-hidden="true">
    <defs>
      <linearGradient id="algartempo-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M14 2 L26 34 L18 34 L10 12 L2 34 L-6 34 Z" transform="translate(6 0)" fill="url(#algartempo-gradient)" />
    <path d="M24 14 L32 34 L24 34 L20 24 Z" fill="#1e40af" />
  </svg>
);

/** Cartao de abastecimento ALGARTEMPO: identificacao do motorista, nao e cartao bancario. */
export const FuelCard: React.FC<FuelCardProps> = ({ motoristaNome, numeroCartao, qrValue, className = '' }) => {
  return (
    <div
      className={`relative w-full max-w-md aspect-[1.586/1] rounded-2xl bg-white text-slate-900 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.35)] overflow-hidden border border-slate-100 ${className}`}
    >
      <Fuel className="absolute -right-6 -bottom-8 w-40 h-40 text-sky-50" strokeWidth={1.1} />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-sky-50/60" />

      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlgarTempoMark />
            <div>
              <div className="text-lg font-extrabold tracking-tight leading-none">
                <span className="text-blue-900">ALGAR</span>
                <span className="text-sky-500">TEMPO</span>
              </div>
              <p className="text-[10px] text-sky-600 font-medium tracking-wide">trabalho temporário</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold text-blue-900 tracking-wide leading-tight">CARTÃO DE</p>
            <p className="text-[10px] font-bold text-blue-900 tracking-wide leading-tight">ABASTECIMENTO</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-sky-600 tracking-widest">MOTORISTA</p>
            <p className="text-xl font-bold text-blue-950 truncate">{motoristaNome}</p>
          </div>

          <div className="border-t border-slate-200" />

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-sky-600 tracking-widest">N.º CARTÃO</p>
              <p className="text-lg font-mono font-semibold tracking-[0.15em] text-blue-950">{numeroCartao}</p>
            </div>
            {qrValue && (
              <div className="bg-white p-1 rounded-md border border-slate-200">
                <QrCodeMark value={qrValue} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium tracking-wide">
          <span>FROTA PRO</span>
          <span>UTILIZAÇÃO EXCLUSIVA — FROTA ALGARTEMPO</span>
        </div>
      </div>
    </div>
  );
};

const QrCodeMark: React.FC<{ value: string }> = ({ value }) => {
  const QRCode = React.lazy(() => import('react-qr-code'));
  return (
    <React.Suspense fallback={<div className="w-14 h-14" />}>
      <QRCode value={value} size={56} />
    </React.Suspense>
  );
};
