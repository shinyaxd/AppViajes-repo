import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ==========================================================
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RegisterResponse
} from '../../shared/models';

// Re-exportamos las interfaces para mantener backward compatibility
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RegisterResponse
};

// ==========================================================
// SERVICIO DE AUTENTICACIÓN
// ==========================================================
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private loadingService = inject(LoadingService);

  private readonly BASE_ENDPOINT = environment.apiUrl;
  private readonly TOKEN_KEY = 'sanctum_token';
  private readonly ROLE_KEY = 'user_role';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeAuth();
    }
  }

  // ==========================================================
  // INICIALIZACIÓN DE SESIÓN
  // ==========================================================
  private initializeAuth(): void {
    if (this.hasToken()) {
      this.getMe().subscribe({
        error: () => {
          console.warn('⚠️ Token inválido o expirado. Sesión cerrada.');
        }
      });
    }
  }

  // ==========================================================
  // REGISTRO
  // ==========================================================
  register(data: RegisterData): Observable<RegisterResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/register`;

    const basePayload = {
      email: data.email,
      password: data.password,
      rol: data.rol,
      device_name: 'WebApp'
    };

    let payload: any;

    if (data.rol === 'viajero') {
      payload = {
        ...basePayload,
        nombre: data.nombre,
        apellido: data.apellido
      };
    } else if (data.rol === 'proveedor') {
      payload = {
        ...basePayload,
        empresa_nombre: data.empresa_nombre,
        telefono: data.telefono,
        ruc: data.ruc
      };
    } else {
      payload = basePayload;
    }

    this.loadingService.show('Registrando usuario...');

    return this.http.post<RegisterResponse>(url, payload).pipe(
      tap(response => {
        console.log('✅ Registro exitoso:', response.data.user);

        if (response.data?.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.TOKEN_KEY, response.data.token);
          this.isAuthenticatedSubject.next(true);
          this.setCurrentUser(response.data.user);
        }
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'registro')),
      finalize(() => this.loadingService.hide())
    );
  }

  // ==========================================================
  // LOGIN
  // ==========================================================
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/login`;
    const payload = { ...credentials, device_name: 'WebApp' };

    this.loadingService.show('Iniciando sesión...');

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          if (response.user?.rol) {
            localStorage.setItem(this.ROLE_KEY, response.user.rol);
          }
          this.isAuthenticatedSubject.next(true);
          this.setCurrentUser(response.user);
        }
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'inicio de sesión')),
      finalize(() => this.loadingService.hide())
    );
  }

  // ==========================================================
  // PERFIL
  // ==========================================================
  getMe(): Observable<User> {
    const url = `${this.BASE_ENDPOINT}/auth/me`;
    return this.http.get<{ data: User }>(url).pipe(
      map(res => res.data),
      tap(user => {
        this.setCurrentUser(user);
        if (isPlatformBrowser(this.platformId) && user?.rol) {
          localStorage.setItem(this.ROLE_KEY, user.rol);
        }
      }),
      catchError(error => {
        if (error.status === 401) {
          this.cleanSession();
        }
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  logout(): Observable<any> {
    const url = `${this.BASE_ENDPOINT}/auth/logout`;
    
    this.loadingService.show('Cerrando sesión...');
    
    return this.http.post(url, {}).pipe(
      tap(() => this.cleanSession()),
      catchError(error => {
        console.warn('⚠️ Error cerrando sesión, limpiando local.', error);
        this.cleanSession();
        return of(null);
      }),
      finalize(() => this.loadingService.hide())
    );
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================
  public isLoggedIn(): boolean {
    return this.hasToken();
  }

  public getRole(): string | null {
    const userRole = this.currentUserSubject.value?.rol;
    if (userRole) return userRole;

    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.ROLE_KEY);
    }
    return null;
  }

  public isProveedor$(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => user?.rol === 'proveedor'));
  }

  public isViajero$(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => user?.rol === 'viajero'));
  }

  public setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }

  public cleanSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ROLE_KEY);
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  private hasToken(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private handleError(error: HttpErrorResponse, context: string) {
    console.error(`❌ Error durante ${context}:`, error);
    let message = 'Ocurrió un error inesperado.';

    if (error.status === 0) {
      message = 'No se puede conectar con el servidor.';
    } else if (error.status === 401) {
      message = error.error?.message || 'Credenciales incorrectas.';
    } else if (error.status === 422) {
      const errors = error.error?.errors;
      if (errors) {
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey && errors[firstErrorKey].length > 0) {
          message = errors[firstErrorKey][0];
        }
      } else {
        message = error.error?.message || 'Error de validación.';
      }
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return throwError(() => new Error(message));
  }
}
