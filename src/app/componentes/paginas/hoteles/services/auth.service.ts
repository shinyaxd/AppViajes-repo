import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ==========================================================
// INTERFACES (Sin cambios, son correctas)
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
  // INICIALIZACIÓN Y LÓGICA DE SESIÓN
  // ==========================================================
  private initializeAuth(): void {
    if (this.hasToken()) {
      // Intentar cargar el usuario. Si el token es inválido, getMe se encarga de limpiar.
      this.getMe().subscribe({
        error: (err) => {
          console.warn('⚠️ Token de sesión inválido o expirado. Sesión limpiada.');
          // Ya no es necesario llamar a cleanSession() aquí, el catchError en getMe() lo hace
        }
      });
    }
  }

  // ==========================================================
  // REGISTRO, LOGIN, LOGOUT, GETME
  // ==========================================================
  register(data: RegisterData): Observable<RegisterResponse> {
    const url = `${this.BASE_ENDPOINT}/usuarios`;
    const payload = { ...data } as any;
    // Asumiendo que 'confirmPassword' viene del formulario pero no debe ir a la API
    delete payload.confirmPassword; 

    return this.http.post<RegisterResponse>(url, payload).pipe(
      tap(response => {
        console.log('✅ Usuario registrado correctamente:', response.data);
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'registro'))
    );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.BASE_ENDPOINT}/auth/login`;
    const payload = { ...credentials, device_name: 'WebApp' };

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          // Guardamos token y rol localmente
          localStorage.setItem(this.TOKEN_KEY, response.token);
          if (response.user?.rol) {
            localStorage.setItem(this.ROLE_KEY, response.user.rol);
          }
          this.isAuthenticatedSubject.next(true);
          this.setCurrentUser(response.user); 
        }
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'inicio de sesión'))
    );
  }

  logout(): Observable<any> {
    const url = `${this.BASE_ENDPOINT}/auth/logout`;
    // ⚠️ Se eliminan los headers, el Interceptor los añadirá automáticamente.
    return this.http.post(url, {}).pipe(
      tap(() => this.cleanSession()),
      catchError(error => {
        // En caso de error de red o 401, siempre limpiamos la sesión local
        console.warn('⚠️ Error al intentar logout, limpiando sesión local.', error);
        this.cleanSession();
        return of(null);
      })
    );
  }

  getMe(): Observable<User> {
    const url = `${this.BASE_ENDPOINT}/auth/me`;
    // ⚠️ Se eliminan los headers, el Interceptor los añadirá automáticamente.
    return this.http.get<{ data: User }>(url).pipe(
      map(res => res.data),
      tap(user => {
        this.setCurrentUser(user);
        if (isPlatformBrowser(this.platformId) && user?.rol) {
          localStorage.setItem(this.ROLE_KEY, user.rol);
        }
      }),
      catchError(error => {
        console.error('Error al obtener /auth/me:', error);
        if (error.status === 401) {
          this.cleanSession();
        }
        this.setCurrentUser(null); 
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // MÉTODOS CLAVE PARA EL GUARD DE ROLES
  // ==========================================================
  public isLoggedIn(): boolean {
    return this.hasToken(); 
  }

  /**
   * Obtiene el rol del usuario, priorizando el valor reactivo o el localStorage.
   * Útil para Guards síncronos.
   */
  public getRole(): string | null {
    const userRole = this.currentUserSubject.value?.rol;
    if (userRole) return userRole;

    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.ROLE_KEY); 
    }
    return null;
  }

  /**
   * Observable reactivo para mostrar/ocultar elementos en la UI.
   */
  public isProveedor$(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => user?.rol === 'proveedor'));
  }

  /**
   * Observable reactivo para mostrar/ocultar elementos en la UI.
   */
  public isViajero$(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => user?.rol === 'viajero'));
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================

  // ... (cleanSession, getToken, hasToken, handleError, etc. se mantienen igual)
  
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
    // ... (Tu lógica de manejo de errores está correcta)
    console.error(`❌ Error durante ${context}:`, error);
    let message = 'Ocurrió un error inesperado.';
    // ... (Resto de tu lógica)
    if (error.status === 0) {
      message = 'No se puede conectar con el servidor.';
    } else if (error.status === 401) {
      message = error.error?.message || 'Credenciales incorrectas o sesión expirada.';
    } else if (error.status === 422 && error.error?.errors?.email) {
      message = error.error.errors.email[0] || 'El correo ya está registrado.';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return throwError(() => new Error(message));
  }
}