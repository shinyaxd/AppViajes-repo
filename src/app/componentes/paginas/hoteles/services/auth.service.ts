// src/app/componentes/paginas/hoteles/services/auth.service.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ==========================================================
// INTERFACES (Sin cambios)
// ==========================================================
export interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string;
}

export interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: 'viajero' | 'proveedor';
}

export interface User {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
  rol?: string;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  data: User;
}

// ==========================================================
// SERVICIO DE AUTENTICACIÓN
// ==========================================================
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  private readonly BASE_ENDPOINT = environment.apiUrl;
  private readonly TOKEN_KEY = 'sanctum_token';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  // NUEVO: Subject para mantener el objeto User
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // ==========================================================
  // REGISTRO → POST /api/usuarios (Sin cambios)
  // ==========================================================
  register(data: RegisterData): Observable<RegisterResponse> {
    const url = `${this.BASE_ENDPOINT}/usuarios`;

    // Eliminamos confirmPassword si existe
    const payload = { ...data } as any;
    delete payload.confirmPassword;

    return this.http.post<RegisterResponse>(url, payload).pipe(
      tap(response => {
        console.log('✅ Usuario registrado correctamente:', response.data);
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'registro'))
    );
  }

  // ==========================================================
  // LOGIN → POST /api/auth/login (MODIFICADO)
  // ==========================================================
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/login`;
    const payload = { ...credentials, device_name: 'WebApp' };

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          this.isAuthenticatedSubject.next(true);
          // NUEVO: Almacenar el objeto User
          this.setCurrentUser(response.user);
          console.log('✅ Sesión iniciada para:', response.user.email);
        }
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'inicio de sesión'))
    );
  }

  // ==========================================================
  // LOGOUT → POST /api/auth/logout (Sin cambios)
  // ==========================================================
  logout(): Observable<any> {
    const url = `${this.BASE_ENDPOINT}/auth/logout`;
    const headers = this.getAuthHeaders();

    return this.http.post(url, {}, { headers }).pipe(
      tap(() => this.cleanSession()),
      catchError(error => {
        console.warn('⚠️ Error en logout, limpiando sesión local:', error);
        this.cleanSession();
        return of(null);
      })
    );
  }

  // ==========================================================
  // PERFIL → GET /api/auth/me (MODIFICADO)
  // ==========================================================
  getMe(): Observable<User> {
    const url = `${this.BASE_ENDPOINT}/auth/me`;
    const headers = this.getAuthHeaders();

    return this.http.get<{ data: User }>(url, { headers }).pipe(
      map(res => res.data),
      // NUEVO: Actualizar el Subject después de obtener el usuario
      tap(user => this.setCurrentUser(user)),
      catchError(error => {
        console.error('Error al obtener /auth/me:', error);
        if (error.status === 401) this.cleanSession();
        // IMPORTANTE: Limpiar el Subject si falla la carga del perfil
        this.setCurrentUser(null); 
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================

  // NUEVO: Método para actualizar el Subject del usuario
  public setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }

  private cleanSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    this.isAuthenticatedSubject.next(false);
    // NUEVO: Limpiar el usuario al cerrar sesión
    this.currentUserSubject.next(null); 
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    // Agregamos 'Accept': 'application/json' por defecto
    return new HttpHeaders({
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  private hasToken(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private handleError(error: HttpErrorResponse, context: string) {
    console.error(`❌ Error durante ${context}:`, error);
    let message = 'Ocurrió un error inesperado.';

    // Lógica para obtener mensajes específicos de Laravel (401 y 422)
    if (error.status === 0) {
      message = 'No se puede conectar con el servidor.';
    } else if (error.status === 401) {
      // Intenta usar el mensaje del backend para credenciales incorrectas
      message = error.error?.message || 'Credenciales incorrectas o sesión expirada.';
    } else if (error.status === 422 && error.error?.errors?.email) {
      message = error.error.errors.email[0] || 'El correo ya está registrado.';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return throwError(() => new Error(message));
  }
}