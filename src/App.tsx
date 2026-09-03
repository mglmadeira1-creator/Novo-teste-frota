import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ViaturasPage } from './components/viaturas/ViaturasPage';
import { CombustiveisPage } from './components/combustiveis/CombustiveisPage';
import { OficinaAcessosMecanicosPage } from './components/oficina/admin/OficinaAcessosMecanicosPage';
import { OficinaCartoesAbastecimentoPage } from './components/oficina/admin/OficinaCartoesAbastecimentoPage';
import { AppRole } from './types/auth';

interface AppProps {
  userName: string;
  userEmail: string;
  userRole: AppRole | null;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}

export const App: React.FC<AppProps> = ({ userName, userEmail, userRole, onLogout, isLoggingOut }) => {
  const [activeModule, setActiveModule] = useState('viaturas');
  const [oficinaTab, setOficinaTab] = useState<'mecanicos' | 'cartoes'>('mecanicos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const headerConfig = activeModule === 'combustiveis'
    ? {
        title: 'Gestão de Combustíveis',
        subtitle: 'Controlo de abastecimentos, consumos e custos da frota',
        statusTitle: 'Módulo Financeiro',
        statusSubtitle: 'Análise operacional de combustível',
        refreshLabel: 'Atualizar módulo',
        initials: 'CB'
      }
    : activeModule === 'oficina'
    ? {
        title: 'Terminal Oficina e Acessos',
        subtitle: 'Gestão de acessos dos mecânicos e auditoria operacional da oficina',
        statusTitle: 'Segurança por Código',
        statusSubtitle: 'Hash + salt com revogação imediata',
        refreshLabel: 'Atualizar acessos',
        initials: 'OF'
      }
    : {
        title: 'Gestão de Viaturas',
        subtitle: 'Dados Telemáticos Cartrack & Cadastro Administrativo Supabase',
        statusTitle: 'Frota Ativa',
        statusSubtitle: 'Cartrack integrado em tempo real',
        refreshLabel: 'Atualizar Telemática',
        initials: 'CT'
      };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={headerConfig.title}
          subtitle={headerConfig.subtitle}
          statusTitle={headerConfig.statusTitle}
          statusSubtitle={headerConfig.statusSubtitle}
          refreshLabel={headerConfig.refreshLabel}
          initials={headerConfig.initials}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 p-6">
          {activeModule === 'viaturas' && <ViaturasPage />}
          {activeModule === 'combustiveis' && <CombustiveisPage />}
          {activeModule === 'oficina' && userRole === 'administrador' && (
            <div className="space-y-4">
              <div className="inline-flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setOficinaTab('mecanicos')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${oficinaTab === 'mecanicos' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Acessos dos Mecânicos
                </button>
                <button
                  onClick={() => setOficinaTab('cartoes')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold ${oficinaTab === 'cartoes' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Cartões de Abastecimento
                </button>
              </div>
              {oficinaTab === 'mecanicos' ? <OficinaAcessosMecanicosPage /> : <OficinaCartoesAbastecimentoPage />}
            </div>
          )}
          {activeModule === 'oficina' && userRole !== 'administrador' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-100">Acesso reservado</h2>
              <p className="text-xs text-slate-400 mt-2">
                A gestão de acessos dos mecânicos e cartões de abastecimento está disponível apenas para Administrador.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
