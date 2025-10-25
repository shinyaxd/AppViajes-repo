/**
 * Modelo de Tour
 * Representa un tour o experiencia turística
 */
export interface TourData {
  id?: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  precio: number;
  categoria: 'Aventura' | 'Gastronomía' | 'Cultura' | 'Relajación';
  duracion: number;
  fecha: string;
  cupos: number;
  imagen_url: string;
  galeria_imagenes: string[];
  cosasParaLlevar: string[];
}

/**
 * Categorías disponibles para tours
 */
export type TourCategoria = 'Aventura' | 'Gastronomía' | 'Cultura' | 'Relajación';

/**
 * Detalles completos de un tour (respuesta de la API)
 */
export interface TourDetalles {
  id: number;
  nombre: string;
  descripcion: string;
  ciudad: string;
  pais: string;
  imagen_url: string;
  tour: {
    id: number;
    servicio_id: number;
    categoria: TourCategoria;
    duracion: number; // en minutos
    precio: string | number;
    cosas_para_llevar: string[];
    fecha?: string; // Fecha del tour si no tiene salidas múltiples
    cupos?: number; // Cupos disponibles si no tiene salidas múltiples
  } | null;
  imagenes?: Array<{
    id: number;
    url?: string;
    imagen_url?: string;
  }>;
  actividades?: Array<{
    id: number;
    nombre?: string;
    descripcion: string;
  }>;
  salidas?: Array<{
    id: number;
    servicio_id: number;
    fecha: string; // Formato: "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss.000000Z"
    hora: string;
    cupo_total: number;
    cupo_reservado: number;
    estado: string;
    created_at?: string;
    updated_at?: string;
  }>;
}

/**
 * Respuesta de la API al listar tours
 */
export interface TourListApiResponse {
  current_page: number;
  data: TourData[];
  total: number;
  per_page: number;
  last_page: number;
}

/**
 * Respuesta de la API al obtener detalles de un tour
 */
export interface TourDetalleApiResponse {
  servicio: TourDetalles;
}
