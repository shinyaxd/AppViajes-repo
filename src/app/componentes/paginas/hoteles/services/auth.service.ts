// src/app/services/auth.service.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

// --- INTERFACES ---
export interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string; // opcional
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    nombre: string;
    apellido?: string;
    email: string;
    rol?: string;
    created_at?: string;
  };
}
// --------------------

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  private BASE_ENDPOINT = 'http://localhost:8000/api';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  /**
   * LOGIN → /api/auth/login
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/login`;
    const payload = { ...credentials, device_name: 'WebApp' };

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('sanctum_token', response.token);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error de inicio de sesión:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * LOGOUT → /api/auth/logout
   */
  logout(): Observable<any> {
    const token = this.getToken();
    const url = `${this.BASE_ENDPOINT}/auth/logout`;

    const headers = token
      ? new HttpHeaders({
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        })
      : undefined;

    return this.http.post(url, {}, { headers }).pipe(
      tap(() => this.cleanSession()),
      catchError(error => {
        console.warn('Error en logout, limpiando sesión local:', error);
        this.cleanSession();
        return of(null);
      })
    );
  }

  /**
   * GET USUARIO AUTENTICADO → /api/auth/me
   */
  getMe(): Observable<any> {
    const token = this.getToken();
    const url = `${this.BASE_ENDPOINT}/auth/me`;

    const headers = token
      ? new HttpHeaders({
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        })
      : undefined;

    return this.http.get<{ data: any }>(url, { headers }).pipe(
      map(res => res.data), // 🟢 extrae el usuario dentro de data
      catchError(error => {
        console.error('Error al obtener /auth/me:', error);
        if (error.status === 401) {
          this.cleanSession();
        }
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================

  private cleanSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('sanctum_token');
    }
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('sanctum_token');
    }
    return null;
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}
