/**
 * Barrel export para modelos compartidos
 * Facilita la importación de múltiples modelos desde un solo lugar
 * 
 * Uso:
 * import { User, LoginCredentials, AuthResponse } from '@shared/models';
 */

// Modelos de Usuario
export * from './user.model';

// Modelos de Autenticación
export * from './auth.model';

// Modelos de Hoteles
export * from './hotel.model';

// Modelos de Habitaciones
export * from './habitacion.model';

// Modelos de Tours
export * from './tour.model';

// Modelos de Reservas
export * from './reserva.model';

// Modelos de Reseñas
export * from './review.model';
