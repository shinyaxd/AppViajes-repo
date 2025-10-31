import { Injectable, inject } from '@angular/core';
// 🚨 CAMBIO: HttpHeaders ya no es necesario para la autorización
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
   * 🚨 CAMBIO CRÍTICO: Simplificamos getHeaders(). 
   * Ya NO incluye 'Authorization: Bearer'. 
   * El Interceptor se encarga de la autenticación vía Cookies/CSRF.
   */
  private getHeaders(): HttpHeaders {
    // 🚨 ELIMINAMOS la llamada a this.auth.getToken()
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Se ELIMINA: (token ? { 'Authorization': `Bearer ${token}` } : {})
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

    // 🚨 Se mantiene el uso de getHeaders(), pero ahora solo tiene Content-Type/Accept
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

    // 🚨 Se mantiene el uso de getHeaders()
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
   * REQUIERE AUTENTICACIÓN (gestionada por Interceptor)
   * @param review Datos de la reseña a crear
   * @returns Observable<Review>
   */
  createReview(review: ReviewCreate): Observable<Review> {
    // 🚨 Se mantiene el uso de getHeaders()
    return this.http.post<Review>(`${this.API_URL}/reviews`, review, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error: any) => {
        // Lógica robusta de manejo de errores 401/422/403 (se mantiene)
        console.group('❌ ERROR AL CREAR RESEÑA');
        // ... (resto de la lógica de console.log y manejo de errores)
        console.groupEnd();
        
        // Error de autenticación
        if (error.status === 401) {
          return throwError(() => new Error('Debes iniciar sesión para dejar una reseña.'));
        }
        
        // Error de validación (422)
        if (error.status === 422) {
          let errorMessage = '';
          
          if (error.error?.errors) {
            const errors = error.error.errors;
            const firstErrorKey = Object.keys(errors)[0];
            const firstError = errors[firstErrorKey];
            
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0];
            } else if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
          
          if (!errorMessage) {
            errorMessage = 'No se pudo crear la reseña. Verifica:\n';
            errorMessage += '• La calificación sea entre 1 y 5 estrellas\n';
            errorMessage += '• El comentario tenga entre 10 y 300 caracteres\n';
            errorMessage += '• No hayas dejado una reseña anteriormente';
          }
          
          return throwError(() => new Error(errorMessage));
        }
        
        // Error de permisos (403)
        if (error.status === 403) {
          return throwError(() => new Error('No tienes permiso para dejar una reseña en este servicio.'));
        }
        
        // Otros errores
        return throwError(() => new Error('No se pudo crear la reseña. Intenta nuevamente.'));
      })
    );
  }

  /**
   * Actualizar una reseña existente
   * REQUIERE AUTENTICACIÓN (gestionada por Interceptor)
   * @param reviewId ID de la reseña
   * @param review Datos actualizados
   * @returns Observable<Review>
   */
  updateReview(reviewId: number, review: ReviewUpdate): Observable<Review> {
    // 🚨 Se mantiene el uso de getHeaders()
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
   * REQUIERE AUTENTICACIÓN (gestionada por Interceptor)
   * @param reviewId ID de la reseña a eliminar
   * @returns Observable<void>
   */
  deleteReview(reviewId: number): Observable<void> {
    // 🚨 Se mantiene el uso de getHeaders()
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

  // Los métodos utilitarios se mantienen sin cambios:
  
  /**
   * Calcular el promedio de calificaciones
   */
  calcularPromedio(reviews: Review[]): number {
    if (!reviews || reviews.length === 0) return 0;
    const suma = reviews.reduce((acc, review) => acc + review.calificacion, 0);
    return Math.round((suma / reviews.length) * 10) / 10;
  }

  /**
   * Obtener el texto descriptivo según el promedio
   */
  getTextoCalificacion(promedio: number): string {
    if (promedio >= 4.5) return 'Excelente';
    if (promedio >= 4.0) return 'Muy bueno';
    if (promedio >= 3.0) return 'Bueno';
    if (promedio >= 2.0) return 'Regular';
    return 'Mejorable';
  }
}