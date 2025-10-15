/**
 * Modelo de Habitación de Hotel
 * Representa una habitación/tipo de habitación dentro de un hotel
 */
export interface Habitacion {
  id: number;
  nombre: string;
  capacidad_adultos: number;
  capacidad_ninos: number;
  cantidad: number;
  precio_por_noche: number;
  descripcion?: string;
  unidades_disponibles?: number;
  seleccionada?: number; // Para uso en formularios de reserva
}

/**
 * Payload para crear una habitación
 */
export interface HabitacionCreatePayload {
  servicio_id?: number; // Se asignará después de crear el hotel
  nombre: string;
  capacidad_adultos: number;
  capacidad_ninos: number;
  precio_por_noche: number;
  cantidad: number;
  descripcion?: string;
}
