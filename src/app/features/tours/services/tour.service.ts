// src/app/componentes/paginas/tour/services/tours.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ==========================================================
import { 
  TourData, 
  TourDetalles, 
  TourListApiResponse,
  TourDetalleApiResponse 
} from '../../../shared/models';

// Re-exportamos las interfaces para mantener backward compatibility
export type { 
  TourData, 
  TourDetalles,
  TourListApiResponse,
  TourDetalleApiResponse
};

// Interfaz para la respuesta paginada de la API (deprecated - usar TourListApiResponse)
interface TourApiResponse {
  current_page: number;
  data: any[];
  total: number;
  per_page: number;
  last_page: number;
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_URL = environment.apiUrl;

  /**
   * ✅ Obtiene headers dinámicamente (usa el token actual del usuario)
   */
  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  /**
   * Obtener todos los tours
   */
  getTours(): Observable<TourData[]> {
    return this.http.get<TourListApiResponse>(`${this.API_URL}/tours`, {
      headers: this.getHeaders()
    }).pipe(
      map((response: TourListApiResponse) => response.data)
    );
  }

  /**
   * Obtener un tour por ID
   * La API retorna: { servicio: {..., tour: {...}, imagenes: [], actividades: [], salidas: [] } }
   */
  getTourById(id: number): Observable<TourDetalles> {
    return this.http.get<TourDetalleApiResponse>(`${this.API_URL}/tours/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map((response: TourDetalleApiResponse) => response.servicio)
    );
  }

  /**
   * Crear un nuevo tour (requiere autenticación)
   */
  createTour(tour: TourData): Observable<TourData> {
    return this.http.post<TourData>(`${this.API_URL}/tours`, tour, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar un tour existente (requiere autenticación)
   */
  updateTour(id: number, tour: TourData): Observable<TourData> {
    return this.http.put<TourData>(`${this.API_URL}/tours/${id}`, tour, {
      headers: this.getHeaders()
    });
  }

  /**
   * Eliminar un tour (requiere autenticación)
   */
  deleteTour(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tours/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Buscar tours por categoría
   */
  getToursByCategoria(categoria: string): Observable<TourData[]> {
    return this.http.get<TourListApiResponse>(`${this.API_URL}/tours`, {
      headers: this.getHeaders(),
      params: { categoria }
    }).pipe(
      map((response: TourListApiResponse) => response.data)
    );
  }
}
