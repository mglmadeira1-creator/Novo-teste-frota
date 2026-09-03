import { cartrackApi } from '../api/cartrackApi';

export interface CartrackVeiculoResumo {
  cartrack_vehicle_id: string;
  cartrack_registration: string;
  model: string;
}

export interface CartrackMotoristaResumo {
  driver_id: string;
  nome: string;
  driver_id_tag?: string;
}

/** Diretorio de viaturas e motoristas obtido diretamente da Cartrack (sem tabelas locais). */
export const cartrackDirectoryService = {
  async listVeiculos(): Promise<CartrackVeiculoResumo[]> {
    const vehicles = await cartrackApi.getVehicles();

    return vehicles
      .map((vehicle) => ({
        cartrack_vehicle_id: String(vehicle.vehicle_id),
        cartrack_registration: vehicle.registration,
        model: `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'N/D'
      }))
      .sort((a, b) => a.cartrack_registration.localeCompare(b.cartrack_registration));
  },

  async listMotoristas(): Promise<CartrackMotoristaResumo[]> {
    const statuses = await cartrackApi.getVehiclesStatus();
    const byDriverId = new Map<string, CartrackMotoristaResumo>();

    statuses.forEach((status) => {
      const driver = status.driver;
      if (!driver) {
        return;
      }

      const nome = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
      const driverId = driver.driver_id || (nome ? `nome:${nome.toLowerCase()}` : undefined);

      if (!driverId || !nome) {
        return;
      }

      if (!byDriverId.has(driverId)) {
        byDriverId.set(driverId, {
          driver_id: driverId,
          nome,
          driver_id_tag: driver.driver_id_tag || undefined
        });
      }
    });

    return Array.from(byDriverId.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }
};
