import React, { useEffect, useState } from 'react';
import { LiveVehicleMap } from './LiveVehicleMap';
import { ViaturaDetailModal } from './ViaturaDetailModal';
import { viaturasService } from '../../services/viaturasService';
import { ViaturaCompleta } from '../../types/viaturaCompleta';

export const GpsMapPage: React.FC = () => {
  const [viaturas, setViaturas] = useState<ViaturaCompleta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedViatura, setSelectedViatura] = useState<ViaturaCompleta | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const data = await viaturasService.getViaturas();
    setViaturas(data);
    setLastUpdated(new Date().toISOString());
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <LiveVehicleMap
        viaturas={viaturas}
        onSelectViatura={setSelectedViatura}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
      />

      <ViaturaDetailModal
        viatura={selectedViatura}
        onClose={() => setSelectedViatura(null)}
        onRefresh={loadData}
      />
    </div>
  );
};