import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const API_URL = 'http://localhost:8000/api';
const AUTH_TOKEN = '';

const API_HEADERS = new HttpHeaders({
  'Accept': 'application/json',
  'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : ''
});

export interface TourData {
  id: number;
  proveedor_id?: number;
  nombre: string;
  tipo: string;
  ciudad: string;
  pais?: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  activo?: boolean;
  tour?: {
    servicio_id: number;
    categoria: string;
    duracion_min: number;
    precio_persona: string;
    capacidad_por_salida: number;
  } | null;
}

export interface TourDetalles {
  id: number;
  proveedor_id?: number;
  nombre: string;
  tipo: string;
  ciudad: string;
  pais?: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  activo?: boolean;
  tour?: {
    servicio_id: number;
    categoria: string;
    duracion_min: number;
    precio_persona: string;
    capacidad_por_salida: number;
  } | null;
  extras?: any[];
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private http = inject(HttpClient);

  getTours(params?: Record<string, any>): Observable<TourData[]> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get<any>(`${API_URL}/tours`, { headers: API_HEADERS, params: httpParams }).pipe(
      map(res => {
        // El backend devuelve { data: [...], first_page_url, from, last_page, etc. }
        const tours = res.data ?? res;
        return tours.filter((t: any) => t.activo && t.tour !== null); // Solo tours activos con datos completos
      })
    );
  }

  getTourDetalles(id: number): Observable<TourDetalles> {
    return this.http.get<any>(`${API_URL}/tours/${id}`, { headers: API_HEADERS }).pipe(
      map(res => {
        // El backend puede devolver { data: {...} } o directamente el objeto
        const tourData = res.data ?? res;
        return {
          ...tourData,
          extras: tourData.extras ?? []
        } as TourDetalles;
      })
    );
  }

  // Método para crear reservas de tours (similar a hoteles)
  crearReservaTour(data: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/reservas/tours`, data, { headers: API_HEADERS });
  }

  // Método para pagos de tours
  crearPago(data: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/pagos/tours`, data, { headers: API_HEADERS });
  }

  // Método para actualizar un tour existente
  actualizarTour(id: number, datos: Partial<TourData>): Observable<TourData> {
    return this.http.put<TourData>(`${API_URL}/tours/${id}`, datos, { headers: API_HEADERS });
  }

  // Método para eliminar un tour (eliminación lógica - cambia activo a false)
  eliminarTour(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/tours/${id}`, { headers: API_HEADERS });
  }

  // Método para desactivar un tour (alternativa más explícita)
  desactivarTour(id: number): Observable<TourData> {
    return this.actualizarTour(id, { activo: false });
  }
}
