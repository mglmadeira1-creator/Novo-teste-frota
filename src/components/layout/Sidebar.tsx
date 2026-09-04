import React from 'react';
import { Truck, Fuel, Users, Wrench, Bell, MapPin, Gauge, LogOut } from 'lucide-react';
import { AppRole } from '../../types/auth';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  userName: string;
  userEmail: string;
  userRole: AppRole | null;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  userName,
  userEmail,
  userRole,
  onLogout,
  isLoggingOut
}) => {
  const navItems = [
    { id: 'viaturas', label: 'Viaturas', icon: Truck, active: true },
    { id: 'combustiveis', label: 'Combustíveis', icon: Fuel, active: true },
    { id: 'oficina', label: 'Oficina', icon: Wrench, active: userRole === 'administrador', badge: userRole === 'administrador' ? undefined : 'Admin' },
    { id: 'motoristas', label: 'Motoristas', icon: Users, badge: 'Em breve' },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, badge: 'Em breve' },
    { id: 'alertas', label: 'Alertas', icon: Bell, badge: 'Em breve' },
    { id: 'gps', label: 'GPS / Mapa Live', icon: MapPin, active: true },
    { id: 'performance', label: 'Performance', icon: Gauge, badge: 'Em breve' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-sm tracking-wide">FROTA PRO</h1>
          <p className="text-xs text-slate-400">Cartrack Telematics SaaS</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Módulos Principais
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.active && setActiveModule(item.id)}
              disabled={!item.active}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-600/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : item.active
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                  : 'text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cartrack Fleet API Ligado</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Fonte da Telemetria: Official Rest API</p>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">Sessão</span>
          <span className="text-xs text-slate-200 font-semibold block mt-1 truncate">{userName}</span>
          <span className="text-[11px] text-slate-400 block truncate">{userEmail}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Role: {userRole === 'administrador' ? 'Administrador' : userRole === 'gestor' ? 'Gestor' : userRole === 'motorista' ? 'Motorista' : 'Por configurar'}
          </span>

          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 disabled:opacity-60"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isLoggingOut ? 'A terminar sessão...' : 'Terminar sessão'}
          </button>
        </div>
      </div>
    </aside>
  );
};
