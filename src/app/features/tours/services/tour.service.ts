// src/app/componentes/paginas/tour/services/tours.service.ts
import { Injectable, inject } from '@angular/core';
// 🚨 CAMBIO: HttpHeaders ya no es necesario para la autorización
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED (Se mantienen)
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
   * 🚨 CAMBIO CLAVE: Simplificamos getHeaders(). 
   * ELIMINAMOS la lógica del token Bearer.
   */
  private getHeaders(): HttpHeaders {
    // 🚨 ELIMINAMOS la llamada a this.auth.getToken()
    // 🚨 ELIMINAMOS la condición del token en el objeto HttpHeaders
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Se ELIMINA: ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  /**
   * Obtener todos los tours
   */
  getTours(): Observable<TourData[]> {
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.get<TourListApiResponse>(`${this.API_URL}/tours`, {
      headers: this.getHeaders()
    }).pipe(
      map((response: TourListApiResponse) => response.data)
    );
  }

  /**
   * Obtener un tour por ID
   */
  getTourById(id: number): Observable<TourDetalles> {
    // 🚨 Se mantiene el uso de getHeaders()
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
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.post<TourData>(`${this.API_URL}/tours`, tour, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar un tour existente (requiere autenticación)
   */
  updateTour(id: number, tour: TourData): Observable<TourData> {
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.put<TourData>(`${this.API_URL}/tours/${id}`, tour, {
      headers: this.getHeaders()
    });
  }

  /**
   * Eliminar un tour (requiere autenticación)
   */
  deleteTour(id: number): Observable<void> {
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.delete<void>(`${this.API_URL}/tours/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Buscar tours por categoría
   */
  getToursByCategoria(categoria: string): Observable<TourData[]> {
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.get<TourListApiResponse>(`${this.API_URL}/tours`, {
      headers: this.getHeaders(),
      params: { categoria }
    }).pipe(
      map((response: TourListApiResponse) => response.data)
    );
  }
}