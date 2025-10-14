// src/app/componentes/paginas/tour/services/tours.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaz que representa los datos de un Tour
export interface TourData {
  id?: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  precio: number;
  ubicacion: string;
  categoria: 'Aventura' | 'Gastronomía' | 'Cultura' | 'Relajación';
  duracion: number;
  fecha: string;
  cupos: number;
  imagen_url: string;
  galeria_imagenes: string[];
  cosasParaLlevar: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private apiUrl = 'http://localhost:8000/api/tours'; // URL base del backend Laravel

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los tours
   */
  getTours(): Observable<TourData[]> {
    return this.http.get<TourData[]>(this.apiUrl);
  }

  /**
   * Obtener un tour por ID
   */
  getTourById(id: number): Observable<TourData> {
    return this.http.get<TourData>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo tour
   */
  createTour(tour: TourData): Observable<TourData> {
    return this.http.post<TourData>(this.apiUrl, tour);
  }

  /**
   * Actualizar un tour existente
   */
  updateTour(id: number, tour: TourData): Observable<TourData> {
    return this.http.put<TourData>(`${this.apiUrl}/${id}`, tour);
  }

  /**
   * Eliminar un tour
   */
  deleteTour(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
