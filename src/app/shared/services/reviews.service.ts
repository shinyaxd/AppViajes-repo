import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Review, ReviewCreate, ReviewUpdate, ReviewListResponse } from '../models/review.model';

/**
 * Servicio para manejar operaciones CRUD de reseñas
 * Conecta con el backend de reviews (hoteles y tours)
 */
@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API_URL = environment.apiUrl;

  /**
   * Obtiene headers dinámicamente con token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  /**
   * Obtener todas las reseñas (paginadas)
   * @param page Número de página (opcional)
   * @returns Observable<ReviewListResponse>
   */
  getReviews(page?: number): Observable<ReviewListResponse> {
    let params = new HttpParams();
    if (page) {
      params = params.set('page', page.toString());
    }

    return this.http.get<ReviewListResponse>(`${this.API_URL}/reviews`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError((error: Error) => {
        console.error('Error al obtener reseñas:', error);
        return throwError(() => new Error('No se pudieron cargar las reseñas.'));
      })
    );
  }

  /**
   * Obtener reseñas de un servicio específico (hotel o tour)
   * @param servicioId ID del servicio (hotel o tour)
   * @param page Número de página (opcional)
   * @returns Observable<ReviewListResponse>
   */
  getReviewsByServicio(servicioId: number, page?: number): Observable<ReviewListResponse> {
    let params = new HttpParams().set('servicio_id', servicioId.toString());
    if (page) {
      params = params.set('page', page.toString());
    }

    return this.http.get<ReviewListResponse>(`${this.API_URL}/reviews`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError((error: Error) => {
        console.error(`Error al obtener reseñas del servicio ${servicioId}:`, error);
        return throwError(() => new Error('No se pudieron cargar las reseñas del servicio.'));
      })
    );
  }

  /**
   * Obtener solo las reseñas (data) de un servicio
   * @param servicioId ID del servicio
   * @returns Observable<Review[]>
   */
  getReviewsDataByServicio(servicioId: number): Observable<Review[]> {
    return this.getReviewsByServicio(servicioId).pipe(
      map((response: ReviewListResponse) => response.data)
    );
  }

  /**
   * Crear una nueva reseña
   * REQUIERE AUTENTICACIÓN
   * @param review Datos de la reseña a crear
   * @returns Observable<Review>
   */
  createReview(review: ReviewCreate): Observable<Review> {
    return this.http.post<Review>(`${this.API_URL}/reviews`, review, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error: any) => {
        console.error('Error al crear reseña:', error);
        if (error.status === 401) {
          return throwError(() => new Error('Debes iniciar sesión para dejar una reseña.'));
        }
        if (error.status === 422) {
          return throwError(() => new Error('Datos inválidos. Verifica que la calificación y el comentario sean correctos.'));
        }
        return throwError(() => new Error('No se pudo crear la reseña. Intenta nuevamente.'));
      })
    );
  }

  /**
   * Actualizar una reseña existente
   * REQUIERE AUTENTICACIÓN (solo el autor puede actualizar)
   * @param reviewId ID de la reseña
   * @param review Datos actualizados
   * @returns Observable<Review>
   */
  updateReview(reviewId: number, review: ReviewUpdate): Observable<Review> {
    return this.http.put<Review>(`${this.API_URL}/reviews/${reviewId}`, review, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error: any) => {
        console.error(`Error al actualizar reseña ${reviewId}:`, error);
        if (error.status === 401) {
          return throwError(() => new Error('Debes iniciar sesión para editar esta reseña.'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('No tienes permiso para editar esta reseña.'));
        }
        return throwError(() => new Error('No se pudo actualizar la reseña.'));
      })
    );
  }

  /**
   * Eliminar una reseña
   * REQUIERE AUTENTICACIÓN (solo el autor puede eliminar)
   * @param reviewId ID de la reseña a eliminar
   * @returns Observable<void>
   */
  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/reviews/${reviewId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error: any) => {
        console.error(`Error al eliminar reseña ${reviewId}:`, error);
        if (error.status === 401) {
          return throwError(() => new Error('Debes iniciar sesión para eliminar esta reseña.'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('No tienes permiso para eliminar esta reseña.'));
        }
        return throwError(() => new Error('No se pudo eliminar la reseña.'));
      })
    );
  }

  /**
   * Calcular el promedio de calificaciones
   * @param reviews Array de reseñas
   * @returns Promedio redondeado a 1 decimal
   */
  calcularPromedio(reviews: Review[]): number {
    if (!reviews || reviews.length === 0) return 0;
    const suma = reviews.reduce((acc, review) => acc + review.calificacion, 0);
    return Math.round((suma / reviews.length) * 10) / 10;
  }

  /**
   * Obtener el texto descriptivo según el promedio
   * @param promedio Promedio de calificaciones
   * @returns Texto descriptivo (Excelente, Muy bueno, etc.)
   */
  getTextoCalificacion(promedio: number): string {
    if (promedio >= 4.5) return 'Excelente';
    if (promedio >= 4.0) return 'Muy bueno';
    if (promedio >= 3.0) return 'Bueno';
    if (promedio >= 2.0) return 'Regular';
    return 'Mejorable';
  }
}
