import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// Interfaces básicas para Reserva y Usuario
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Reserva {
  id: number;
  codigo_reserva: string;
  usuario_id: number;
  servicio_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  huespedes: number;
  estado: string;
  created_at?: string;
  updated_at?: string;
  usuario?: Usuario;
  // Puedes agregar más campos según lo que devuelva tu API
}

// Respuesta para listado de reservas
export interface ReservaListApiRespuesta {
  data: Reserva[];
  total: number;
}

// Respuesta para una reserva específica
export interface ReservaDetallesApiRespuesta {
  message: string;
  data: Reserva;
}

// Respuesta para reservas por usuario
export interface ReservasPorUsuarioApiRespuesta {
  usuario: Usuario;
  reservas: Reserva[];
  total_reservas: number;
  estadisticas: {
    pendientes: number;
    confirmadas: number;
    canceladas: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  private http = inject(HttpClient);

  // Listar todas las reservas (con filtros opcionales)
  getReservas(params?: any): Observable<ReservaListApiRespuesta> {
    return this.http.get<ReservaListApiRespuesta>(`/api/reservas`, { params });
  }

  // Crear una nueva reserva
  crearReserva(data: any): Observable<ReservaDetallesApiRespuesta> {
    return this.http.post<ReservaDetallesApiRespuesta>(`/api/reservas`, data);
  }

  // Obtener detalles de una reserva por ID
  getReserva(id: number): Observable<ReservaDetallesApiRespuesta> {
    return this.http.get<ReservaDetallesApiRespuesta>(`/api/reservas/${id}`);
  }

  // Actualizar estado de una reserva
  actualizarEstado(id: number, estado: string): Observable<any> {
    return this.http.patch(`/api/reservas/${id}/estado`, { estado });
  }

  // Cancelar una reserva
  cancelarReserva(id: number, motivo?: string): Observable<any> {
    return this.http.post(`/api/reservas/${id}/cancelar`, { motivo });
  }

  // Obtener reservas de un usuario específico
  getReservasPorUsuario(usuario_id: number): Observable<ReservasPorUsuarioApiRespuesta> {
    return this.http.get<ReservasPorUsuarioApiRespuesta>(`/api/usuarios/${usuario_id}/reservas`);
  }

  // Obtener reservas de un servicio específico
  getReservasPorServicio(servicio_id: number): Observable<any> {
    return this.http.get(`/api/servicios/${servicio_id}/reservas`);
  }

  // Buscar reserva por código
  buscarPorCodigo(codigo: string): Observable<ReservaDetallesApiRespuesta> {
    return this.http.get<ReservaDetallesApiRespuesta>(`/api/reservas/buscar/${codigo}`);
  }
}