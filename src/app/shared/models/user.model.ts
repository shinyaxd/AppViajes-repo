/**
 * Modelo de Usuario
 * Representa la información de un usuario del sistema (viajero o proveedor)
 */
export interface User {
  id: number;
  nombre?: string;
  apellido?: string;
  email: string;
  rol?: string;
  empresa_nombre?: string;
  telefono?: string;
  ruc?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Tipo para roles de usuario
 */
export type UserRole = 'viajero' | 'proveedor';
