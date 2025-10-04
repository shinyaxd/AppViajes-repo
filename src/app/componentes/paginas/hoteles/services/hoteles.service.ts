import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// ==========================================================
// 0. CONFIGURACIÓN DE SEGURIDAD (Bearer Token)
// ==========================================================
// 💡 CLAVE: Token de tu colección de Postman (Asumiendo que el token es fijo para la demo)
const AUTH_TOKEN = '2|dhrfHu5A4DKCzIFNosj5VjgZm0T5EpHU83VpS8kh09bbcb58';

const API_HEADERS = new HttpHeaders({
  'Accept': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

// ==========================================================
// 1. INTERFACES DE DATOS BÁSICAS (Modelo para el Frontend)
// ==========================================================

// Interfaz que describe una habitación de hotel
export interface Habitacion {
  id: number;
  nombre: string;
  capacidad_adultos: number;
  capacidad_ninos: number;
  cantidad: number; // unidades totales (stock)
  precio_por_noche: number;
  descripcion?: string;
  unidades_disponibles?: number;
  seleccionada?: number
}

// Interfaz para el objeto base del Hotel (datos de Hotel + Servicio)
// 💡 CORRECCIÓN: 'imagen_url' ahora es un string (la URL principal).
// Añadimos 'galeria_imagenes' para guardar el array completo de la API.
export interface HotelData {
  id: number; // Corresponde al servicio_id en el backend
  nombre: string;
  ciudad: string;
  pais: string;
  direccion: string;
  descripcion: string | null; // Aceptamos null si la API lo devuelve
  estrellas: number;
  imagen_url: string; // 💡 La URL principal para el frontend
  galeria_imagenes: string[]; // El array completo de imágenes
  precio_por_noche: number | null; // Aceptamos null si la API lo devuelve
}

// Interfaz del Hotel con sus habitaciones (Usada por los componentes)
export interface HotelDetalles {
  hotel: HotelData;
  habitaciones: Habitacion[];
}


// ==========================================================
// 2. INTERFACES DE RESPUESTA DE LA API (Adaptadas a Laravel)
// ==========================================================

// 2.1. Respuesta para LISTADOS (GET /api/hoteles)
export interface HotelListApiRespuesta {
  // Usamos un tipo para reflejar el objeto que viene dentro de 'data'
  data: Array<{
    id: number;
    direccion: string;
    estrellas: number;
    nombre: string;
    ciudad: string;
    pais: string;
    precio_por_noche: number | null;
    imagen_url: string[]; // Viene como array en la API
    descripcion: string | null;
  }>;
}

// 2.2. Respuesta para DETALLES (GET /api/hoteles/{id})
export interface HotelDetallesApiRespuesta {
    hotel: {
        servicio_id: number;
        direccion: string;
        estrellas: number;
        nombre: string;
        ciudad: string;
        pais: string;
        precio_por_noche: number | null;
        imagen_url: string[];
        descripcion: string | null;
    };
    habitaciones: Habitacion[];
}

// ==========================================================
// 3. HOTEL SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private http = inject(HttpClient);

  /**
   * Obtiene la lista de todos los hoteles (o filtrados por disponibilidad).
   * @param params Parámetros opcionales de búsqueda (check_in, check_out, etc.)
   * @returns Un Observable que emite un array de hoteles.
   */
  getHoteles(params?: any): Observable<HotelData[]> {
    // 💡 CLAVE: Incluimos los headers de autenticación
    return this.http.get<HotelListApiRespuesta>(`/api/hoteles`, { headers: API_HEADERS, params }).pipe(
      map(response => response.data.map(apiHotel => ({
        id: apiHotel.id,
        nombre: apiHotel.nombre,
        ciudad: apiHotel.ciudad,
        pais: apiHotel.pais,
        direccion: apiHotel.direccion,
        estrellas: apiHotel.estrellas,
        // Tomamos la primera imagen del array como principal
        imagen_url: apiHotel.imagen_url && apiHotel.imagen_url.length > 0 ? apiHotel.imagen_url[0] : 'assets/images/placeholder-hotel.jpg',
        galeria_imagenes: apiHotel.imagen_url ?? [],
        precio_por_noche: apiHotel.precio_por_noche ?? null,
        descripcion: apiHotel.descripcion ?? null
      } as HotelData)))
    );
  }

  /**
   * Obtiene los detalles de un hotel por su ID de Servicio.
   * @param id El ID del servicio del hotel.
   * @returns Un Observable que emite la estructura HotelDetalles.
   */
  getHotelDetalles(id: number): Observable<HotelDetalles> {
    // 💡 CLAVE: Incluir los headers de autenticación
    return this.http.get<HotelDetallesApiRespuesta>(`/api/hoteles/${id}`, { headers: API_HEADERS }).pipe(
      map(response => {
        const hotelApi = response.hotel;
        
        // Creamos el objeto HotelData (modelo de Frontend)
        const hotelData: HotelData = {
          id: hotelApi.servicio_id,
          nombre: hotelApi.nombre,
          ciudad: hotelApi.ciudad,
          pais: hotelApi.pais,
          direccion: hotelApi.direccion,
          estrellas: hotelApi.estrellas,
          
          // 💡 CORRECCIÓN: Extraemos el primer elemento del array para la principal.
          imagen_url: hotelApi.imagen_url && hotelApi.imagen_url.length > 0 ? hotelApi.imagen_url[0] : 'assets/images/placeholder-hotel.jpg',
          galeria_imagenes: hotelApi.imagen_url ?? [],
          
          // 💡 Manejo de Nulos: Asignamos 'null' si la API lo devuelve vacío.
          precio_por_noche: hotelApi.precio_por_noche ?? null,
          descripcion: hotelApi.descripcion ?? null
        };
        
        return {
          hotel: hotelData,
          habitaciones: response.habitaciones
        };
      })
    );
  }
}

