import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class AuthTourService {
  private http = inject(HttpClient);

  login(credentials: any): Observable<any> {
    return this.http.post(`${API_URL}/login`, credentials);
  }

  logout(): Observable<any> {
    return this.http.post(`${API_URL}/logout`, {});
  }
}
