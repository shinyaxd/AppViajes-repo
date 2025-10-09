import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8000/api';
const AUTH_TOKEN = '';

const API_HEADERS = new HttpHeaders({
  'Accept': 'application/json',
  'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : ''
});

export interface ReservaTourData {
  tour_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  personas: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReservasTourService {
  private http = inject(HttpClient);

  crearReserva(reserva: ReservaTourData): Observable<any> {
    return this.http.post(`${API_URL}/reservas/tours`, reserva, { headers: API_HEADERS });
  }

  obtenerMisReservas(): Observable<any> {
    return this.http.get(`${API_URL}/mis-reservas/tours`, { headers: API_HEADERS });
  }

  cancelarReserva(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/reservas/tours/${id}`, { headers: API_HEADERS });
  }
}
