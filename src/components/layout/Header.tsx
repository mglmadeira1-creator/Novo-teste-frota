import React from 'react';
import { Search, RefreshCw, Shield, Bell } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  totalViaturas: number;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing, totalViaturas }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Gestão de Viaturas</h2>
        <p className="text-xs text-slate-400">Dados Telemáticos Cartrack & Cadastro Administrativo Supabase</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'A atualizar...' : 'Atualizar Telemática'}</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-200 block">Frota Ativa</span>
            <span className="text-[11px] text-slate-400">{totalViaturas} viaturas monitorizadas</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
            CT
          </div>
        </div>
      </div>
    </header>
  );
};
