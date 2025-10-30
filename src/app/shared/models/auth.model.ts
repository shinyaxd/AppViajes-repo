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
 * 🔴 CAMBIO: Nueva Respuesta del servidor al hacer login (JWT con Cookie)
 * Coincide con la estructura JSON devuelta por JwtAuthController::login()
 */
export interface AuthResponse {
  message: string;
  // 🔴 ELIMINAMOS: El token ya no viene en el body
  // token: string; 
  // 🔴 AÑADIMOS: La respuesta ahora tiene un nivel 'data' que contiene el usuario
  expires_in: number;
  data: {
    user: User;
  };
}

/**
 * Respuesta del servidor al registrar un usuario
 * (Se mantiene igual, ya que usa 'data: { user: User }')
 */
export interface RegisterResponse {
  message: string;
  data: {
    user: User;
    token?: string;
  };
}