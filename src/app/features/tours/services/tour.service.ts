// src/app/componentes/paginas/tour/services/tours.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ==========================================================
import { TourData } from '../../../shared/models';

// Re-exportamos la interfaz para mantener backward compatibility
export type { TourData };

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
    return this.http.get<TourData[]>(`${this.API_URL}/tours`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener un tour por ID
   */
  getTourById(id: number): Observable<TourData> {
    return this.http.get<TourData>(`${this.API_URL}/tours/${id}`, {
      headers: this.getHeaders()
    });
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
    return this.http.get<TourData[]>(`${this.API_URL}/tours`, {
      headers: this.getHeaders(),
      params: { categoria }
    });
  }
}
