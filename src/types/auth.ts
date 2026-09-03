export type AppRole = 'administrador' | 'gestor' | 'motorista';

export interface AuthRoleInfo {
  role: AppRole | null;
  isAdministrador: boolean;
  isGestor: boolean;
  isMotorista: boolean;
}
