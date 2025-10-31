/**
 * Modelo de Reseña/Review
 * Representa una reseña de usuario para un servicio (hotel o tour)
 */

/**
 * Interface para el objeto de usuario dentro de una reseña
 */
export interface ReviewUser {
  id: number;
  nombre: string | null;
  apellido: string | null;
  nombre_completo: string;
}

/**
 * Interface para una reseña completa (respuesta del backend)
 */
export interface Review {
  id: number;
  servicio_id: number;
  servicio_nombre: string;
  servicio_tipo: 'hotel' | 'tour';
  usuario: ReviewUser;
  comentario: string;
  calificacion: number; // 1-5
  created_at: string;
  updated_at: string;
  fecha_formateada: string;
}

/**
 * Interface para crear una nueva reseña (payload para POST)
 */
export interface ReviewCreate {
  servicio_id: number;
  calificacion: number; // 1-5
  comentario: string; // máximo 300 caracteres según backend
}

/**
 * Interface para actualizar una reseña existente (payload para PUT)
 */
export interface ReviewUpdate {
  calificacion?: number; // 1-5
  comentario?: string;
}

/**
 * Interface para la respuesta paginada de reseñas
 */
export interface ReviewListResponse {
  data: Review[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
}

/**
 * Interface para estadísticas de reseñas
 */
export interface ReviewStats {
  promedio: number;
  total: number;
  distribucion: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
