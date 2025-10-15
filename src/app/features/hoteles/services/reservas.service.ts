// src/app/services/reservas.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ==========================================================
import {
  ReservaHabitacionPayload,
  ReservaApiRespuesta,
  MisReservasHotelItem
} from '../../../shared/models';

// Re-exportamos las interfaces para mantener backward compatibility
export type {
  ReservaHabitacionPayload,
  ReservaApiRespuesta,
  MisReservasHotelItem
};

// ==========================================================
// 0. CONFIGURACIÓN
// ==========================================================
const API_URL = environment.apiUrl || 'http://localhost:8000/api'; // Fallback por seguridad

// ==========================================================
// 2. SERVICIO
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  private http = inject(HttpClient);

  // ========================================================
  // 🏨 RESERVAS DE HABITACIONES
  // ========================================================

  /**
   * Crear una reserva de habitación (POST /api/reservas-habitaciones)
   */
  crearReservaHotel(data: ReservaHabitacionPayload): Observable<ReservaApiRespuesta> {
    
    return this.http.post<ReservaApiRespuesta>(
      `${API_URL}/reservas-habitaciones`,
      data
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ocurrió un error inesperado al procesar la reserva.';
        
        if (error.status === 422) {
          // 422 cubre Validación y No Disponibilidad (según tu controlador)
          errorMessage = error.error?.message || 'Error en los datos o no hay disponibilidad de la habitación.';
        } else if (error.status === 403) {
            // Manejo de permisos
            errorMessage = error.error?.message || 'Permiso denegado. Asegúrate de estar logueado como viajero.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        console.error('Error de API al crear reserva de hotel:', error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Cancelar una reserva de habitación
   */
  cancelarReservaHotel(id: number): Observable<any> {
    return this.http.post(`${API_URL}/reservas-habitaciones/${id}/cancelar`, {});
  }

  /**
   * Obtener las reservas del usuario autenticado (habitaciones)
   */
  // ✅ Tipo de retorno corregido para coincidir con la respuesta del Controller
  getMisReservasHoteles(): Observable<MisReservasHotelItem[]> { 
    return this.http.get<MisReservasHotelItem[]>(`${API_URL}/mis-reservas`);
  }

  // ... (Tus métodos de Tours se mantienen sin cambios)
}
