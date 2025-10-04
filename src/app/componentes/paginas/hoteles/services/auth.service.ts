// src/app/services/auth.service.ts

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // 💡 Importamos HttpErrorResponse
import { Observable, BehaviorSubject, of, throwError } from 'rxjs'; // 💡 Importamos throwError
import { tap, catchError } from 'rxjs/operators';

// --- INTERFACES ---
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}
// --------------------

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 1. INYECTAR PLATFORM_ID
  private platformId = inject(PLATFORM_ID);

  // 🔑 CAMBIO CLAVE: Apuntamos al endpoint base de Laravel
  private BASE_ENDPOINT = '/api';

  // Inicializar isAuthenticatedSubject con la función protegida
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Envía las credenciales y guarda el token si es exitoso.
   * Llama a POST /api/auth/login
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/login`;

    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap(response => {
        // Guardamos el token solo en el navegador
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('sanctum_token', response.token);
            this.isAuthenticatedSubject.next(true);
        }
      }),
      // 💡 MEJORA: Manejamos el error para propagar el mensaje de la API
      catchError((error: HttpErrorResponse) => {
        console.error('Error de inicio de sesión:', error);
        // Propagamos el error para que el componente de login lo maneje
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina el token del servidor y limpia el estado local.
   * Llama a POST /api/auth/logout
   */
  logout(): Observable<any> {
    const url = `${this.BASE_ENDPOINT}/auth/logout`;

    return this.http.post(url, {}).pipe(
      tap(() => this.cleanSession()),
      catchError(error => {
        console.warn('Logout del servidor falló (API no alcanzó o error), limpiando sesión local.', error);
        // Aseguramos la limpieza local aunque el servidor falle
        this.cleanSession();
        return of(null); // Retornamos un Observable exitoso para no detener la UI
      })
    );
  }

  /**
   * Llama al endpoint de usuario actual para verificar el token.
   * Llama a GET /api/auth/me
   */
  getMe(): Observable<any> {
      const url = `${this.BASE_ENDPOINT}/auth/me`;
      return this.http.get(url).pipe(
        catchError(error => {
          console.error('Error al obtener usuario actual /auth/me:', error);
          // Si el token no es válido o expira, podríamos forzar el logout local
          if (error.status === 401) {
             this.cleanSession();
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Limpia el token y el estado de autenticación.
   */
  private cleanSession(): void {
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('sanctum_token');
    }
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Obtiene el token almacenado.
   */
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
        return localStorage.getItem('sanctum_token');
    }
    return null;
  }

  /**
   * Devuelve true si hay un token almacenado.
   */
  private hasToken(): boolean {
    return !!this.getToken();
  }
}