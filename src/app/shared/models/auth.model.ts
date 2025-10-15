import { User } from './user.model';

/**
 * Credenciales para inicio de sesión
 */
export interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string;
}

/**
 * Datos para registro de usuario
 * Campos opcionales según el rol (viajero o proveedor)
 */
export interface RegisterData {
  email: string;
  password: string;
  rol: 'viajero' | 'proveedor';
  // Campos específicos de viajero
  nombre?: string;
  apellido?: string;
  // Campos específicos de proveedor
  empresa_nombre?: string;
  telefono?: string;
  ruc?: string;
}

/**
 * Respuesta del servidor al hacer login
 */
export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

/**
 * Respuesta del servidor al registrar un usuario
 */
export interface RegisterResponse {
  message: string;
  data: {
    user: User;
    token?: string;
  };
}
