import React from 'react';
import cardImage from '../../../cartão frota novo.png';

interface FuelCardProps {
  motoristaNome: string;
  numeroCartao: string;
  qrValue?: string;
  className?: string;
}

export const FuelCard: React.FC<FuelCardProps> = ({ motoristaNome, numeroCartao, className = '' }) => {
  return (
    <div className={`w-full max-w-[760px] [container-type:inline-size] ${className}`}>
      <div className="relative aspect-[1011/638] overflow-hidden rounded-[1.6rem] shadow-[0_20px_60px_-25px_rgba(15,23,42,0.45)]">
        <img
          src={cardImage}
          alt="Cartão de abastecimento AlgarTempo"
          className="absolute inset-0 block h-full w-full object-fill"
          draggable={false}
        />

        <p className="absolute left-[11%] right-[30%] top-[48%] truncate text-[clamp(0.72rem,2.35cqw,1.65rem)] font-bold leading-none text-[#123b78]">
          {motoristaNome}
        </p>
        <p className="absolute left-[11%] right-[30%] top-[62%] truncate text-[clamp(0.72rem,2.3cqw,1.6rem)] font-bold tracking-[0.08em] leading-none text-[#168bd1]">
          {numeroCartao}
        </p>
      </div>
    </div>
  );
};
