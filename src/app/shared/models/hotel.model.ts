import { Habitacion } from './habitacion.model';

/**
 * Modelo principal de Hotel
 * Representa la información completa de un hotel en el sistema
 */
export interface HotelData {
  id: number; // servicio_id en backend
  nombre: string;
  ciudad: string;
  pais: string;
  direccion: string;
  descripcion: string | null;
  estrellas: number;
  imagen_url: string; // imagen principal
  galeria_imagenes: string[]; // todas las imágenes
  precio_por_noche: number | null;
  reservations?: number; // reservas pendientes (para dashboard proveedor)
}

/**
 * Detalles completos de un hotel con sus habitaciones
 */
export interface HotelDetalles {
  hotel: HotelData;
  habitaciones: Habitacion[];
}

/**
 * Respuesta de la API al listar hoteles
 */
export interface HotelListApiRespuesta {
  data: Array<{
    id: number;
    direccion: string;
    estrellas: number;
    nombre: string;
    ciudad: string;
    pais: string;
    precio_por_noche: number | null;
    imagenUrl: string[];
    descripcion: string | null;
  }>;
}

/**
 * Respuesta de la API al listar todos los servicios del proveedor
 */
export interface ServiceData {
  id: number;
  tipo: 'hotel' | 'tour';
  nombre: string;
  descripcion: string | null;
  ciudad: string;
  pais: string;
  imagen_url: string;
  activo: boolean;
  created_at: string;

  // Campos específicos según tipo
  meta_tipo: {
    // Para hoteles
    direccion?: string;
    estrellas?: number;
    habitaciones_count?: number;
    tarifa_min_desde?: number;

    // Para tours
    categoria?: string;
    duracion?: number;
    precio?: number;
    salidas_count?: number | null;
    proximas_salidas?: number | null;
  };
  reservas_totales:{
    confirmadas?: number;
    canceladas?: number;
  };
}

/**
 * Respuesta de la API al listar hoteles del proveedor
 */
export interface SupplierHotelListApiRespuesta {
  data: Array<{
    id: number;
    direccion: string;
    estrellas: number;
    nombre: string;
    ciudad: string;
    pais: string;
    precio_por_noche: number | null;
    imagen_url: string; // imagen principal
    galeria_imagenes: string[]; // todas las imágenes
    descripcion: string | null;
    reservas_pendientes: number; // para el dashboard
  }>;
}

/**
 * Payload para crear un hotel
 */
export interface HotelCreatePayload {
  nombre: string;
  descripcion: string | null;
  direccion: string;
  estrellas: number;
  ciudad: string;
  pais: string;
  imagen_url: string;
  galeria_imagenes: string[];
  activo?: boolean;
}

/**
 * Respuesta del servidor al crear un hotel
 */
export interface HotelCreateResponse {
  message: string;
  data: {
    hotel: any;
    servicio: { id: number; nombre: string; ciudad: string; pais: string; };
  };
}
