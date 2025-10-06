// src/app/services/reservas.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================================
// 0. CONFIGURACIÓN
// ==========================================================
const API_URL = 'http://localhost:8000/api';

// ==========================================================
// 1. INTERFACES
// ==========================================================

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Reserva {
  id: number;
  codigo_reserva?: string;
  usuario_id?: number;
  servicio_id?: number;
  habitacion_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  cantidad?: number;
  personas?: number;
  estado?: string;
  created_at?: string;
  updated_at?: string;
  usuario?: Usuario;
}

export interface ReservaApiRespuesta {
  message?: string;
  data?: Reserva;
}

export interface MisReservasRespuesta {
  data?: Reserva[];
  total?: number;
}

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
   * Crear una reserva de habitación
   */
  crearReservaHotel(data: {
    habitacion_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    cantidad: number;
  }): Observable<ReservaApiRespuesta> {
    return this.http.post<ReservaApiRespuesta>(
      `${API_URL}/reservas-habitaciones`,
      data
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
  getMisReservasHoteles(): Observable<MisReservasRespuesta> {
    return this.http.get<MisReservasRespuesta>(`${API_URL}/mis-reservas`);
  }

  // ========================================================
  // 🏞️ RESERVAS DE TOURS
  // ========================================================

  /**
   * Crear reserva en un tour (para viajeros)
   */
  crearReservaTour(salidaId: number, personas: number): Observable<ReservaApiRespuesta> {
    return this.http.post<ReservaApiRespuesta>(
      `${API_URL}/tours/salidas/${salidaId}/reservas`,
      { personas }
    );
  }

  /**
   * Cancelar reserva de tour
   */
  cancelarReservaTour(reservaId: number): Observable<any> {
    return this.http.post(`${API_URL}/tours/reservas/${reservaId}/cancelar`, {});
  }

  /**
   * Obtener las reservas del usuario autenticado (tours)
   */
  getMisReservasTours(): Observable<MisReservasRespuesta> {
    return this.http.get<MisReservasRespuesta>(`${API_URL}/tours/mis-reservas`);
  }
}
