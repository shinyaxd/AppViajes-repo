export interface Reserva {
  id: number;
  titulo: string; // nombre del servicio (hotel/tour)
  fecha_inicio?: string;
  fecha_fin?: string;
  total?: number;
  imagen?: string; // URL de imagen principal a mostrar en lista
  userId?: number; // opciona: id del usuario propietario
  estado?: 'confirmada' | 'pendiente' | 'cancelada';
  tags?: string[];
  notas?: string;
  creadoEn?: string;
  adultos?: number;
  ninos?: number;
  totalPersonas?: number;
  noches?: number;
  habitaciones?: number;
}

export type MisReservas = Reserva[];
/**
 * Payload para crear una reserva de habitación
 */
export interface ReservaHabitacionPayload {
  habitacion_id: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  cantidad: number;
}

/**
 * Respuesta genérica de la API de reservas
 */
export interface ReservaApiRespuesta {
  message?: string;
  data?: any; // La reserva creada
}

/**
 * Item de reserva de hotel (para listar mis reservas)
 */
export interface MisReservasHotelItem {
  id: number;
  codigo: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad: number;
  precio_noche: number;
  total: number;
  hotel: {
    servicio_id: number;
    nombre: string;
    ciudad: string;
  };
  habitacion: {
    id: number;
    nombre: string;
  };
}
