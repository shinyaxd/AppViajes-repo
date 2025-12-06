import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ItineraryService {
  // Ajusta la URL si es necesario
  private apiUrl = 'http://localhost:8000/api/itineraries';

  constructor(private http: HttpClient) { }

  generarItinerario(datos: any): Observable<any> {
    return this.http.post(this.apiUrl, datos, {
      withCredentials: true // IMPORTANTE: Para enviar cookies de Auth/XSRF
    });
  }
}