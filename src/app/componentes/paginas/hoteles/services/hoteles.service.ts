import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

// ==========================================================
// 0. CONFIGURACIÓN
// ==========================================================
const API_URL = 'http://localhost:8000/api';
const AUTH_TOKEN = '2|dhrfHu5A4DKCzIFNosj5VjgZm0T5EpHU83VpS8kh09bbcb58';

const API_HEADERS = new HttpHeaders({
  'Accept': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

// ==========================================================
// 1. INTERFACES
// ==========================================================
export interface Habitacion {
  id: number;
  nombre: string;
  capacidad_adultos: number;
  capacidad_ninos: number;
  cantidad: number;
  precio_por_noche: number;
  descripcion?: string;
  unidades_disponibles?: number;
  seleccionada?: number;
}

export interface HotelData {
  id: number;
  nombre: string;
  ciudad: string;
  pais: string;
  direccion: string;
  descripcion: string | null;
  estrellas: number;
  imagen_url: string; // principal
  galeria_imagenes: string[]; // array completo
  precio_por_noche: number | null;
}

export interface HotelDetalles {
  hotel: HotelData;
  habitaciones: Habitacion[];
}

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

// ==========================================================
// 2. SERVICIO
// ==========================================================
@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private http = inject(HttpClient);

  /**
   * Obtener lista de hoteles (solo datos generales)
   */
  getHoteles(params?: Record<string, any>): Observable<HotelData[]> {
    const httpParams = new HttpParams({ fromObject: params || {} });

    return this.http
      .get<HotelListApiRespuesta>(`${API_URL}/hoteles`, { headers: API_HEADERS, params: httpParams })
      .pipe(
        map(res =>
          res.data.map(apiHotel => ({
            id: apiHotel.id,
            nombre: apiHotel.nombre,
            ciudad: apiHotel.ciudad,
            pais: apiHotel.pais,
            direccion: apiHotel.direccion,
            estrellas: apiHotel.estrellas,
            imagen_url: apiHotel.imagenUrl?.[0] || 'no hay foto',
            galeria_imagenes: apiHotel.imagenUrl ?? [],
            precio_por_noche: apiHotel.precio_por_noche ?? null,
            descripcion: apiHotel.descripcion ?? null,
          }))
        )
      );
  }

  /**
   * Obtener los detalles de un hotel específico (habitaciones)
   */
  getHotelDetalles(id: number): Observable<HotelDetalles> {
    return this.http
      .get<any>(`${API_URL}/hoteles/${id}`, { headers: API_HEADERS })
      .pipe(
        map(res => {
          const h = res.hotel ?? res.data ?? res;
          if (!h) {
            throw new Error('Formato de respuesta inesperado al obtener detalles del hotel.');
          }

          const hotel: HotelData = {
            id: h.servicio_id,
            nombre: h.nombre,
            ciudad: h.ciudad,
            pais: h.pais,
            direccion: h.direccion,
            estrellas: h.estrellas,
            imagen_url: '',            // Lo completaremos en getHotelCompleto
            galeria_imagenes: [],      // Lo completaremos en getHotelCompleto
            precio_por_noche: null,    // Lo completaremos en getHotelCompleto
            descripcion: null          // Lo completaremos en getHotelCompleto
          };

          const habitaciones: Habitacion[] = (h.habitaciones ?? res.habitaciones ?? []).map((r: any) => ({
            id: r.id,
            nombre: r.nombre ?? '',
            capacidad_adultos: r.capacidad_adultos,
            capacidad_ninos: r.capacidad_ninos,
            cantidad: r.cantidad ?? r.unidades_disponibles ?? 0,
            precio_por_noche: r.precio_por_noche,
            descripcion: r.descripcion ?? ''
          }));

          return { hotel, habitaciones };
        })
      );
  }

  /**
   * Combina getHoteles + getHotelDetalles
   */
  getHotelCompleto(id: number): Observable<HotelDetalles> {
    return forkJoin({
      lista: this.getHoteles(),
      detalle: this.getHotelDetalles(id)
    }).pipe(
      map(({ lista, detalle }) => {
        const hotelLista = lista.find(h => h.id === id);

        if (hotelLista) {
          detalle.hotel = {
            ...hotelLista, // Sobrescribe con los datos de la lista (imagen, descripcion, precio)
          };
        }

        return detalle;
      })
    );
  }
}
