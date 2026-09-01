import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ViaturasPage } from './components/viaturas/ViaturasPage';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState('viaturas');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} totalViaturas={5} />
        <main className="flex-1 p-6">
          {activeModule === 'viaturas' && <ViaturasPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
