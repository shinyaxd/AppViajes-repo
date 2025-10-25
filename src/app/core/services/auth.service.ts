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
  private readonly USER_KEY = 'current_user'; // Datos temporales del usuario

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Carga datos temporales para UX rápida (se validan después con el backend)
      this.loadUserFromStorage();
      // Inicializa y VALIDA con el backend
      this.initializeAuth();
    }
  }

  // ==========================================================
  // INICIALIZACIÓN DE SESIÓN
  // ==========================================================
  /**
   * Carga datos del usuario desde localStorage para mostrar rápidamente.
   * IMPORTANTE: Estos datos son TEMPORALES y se validan con el backend en initializeAuth().
   */
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem(this.USER_KEY);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);
        console.log('⚡ Datos temporales cargados (pendiente validación con backend):', user.nombre);
      } catch (error) {
        console.error('❌ Error al parsear usuario de localStorage:', error);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  /**
   * Inicializa la autenticación VALIDANDO con el backend.
   * Si el token existe, SIEMPRE verifica con el backend que sea válido.
   */
  private initializeAuth(): void {
    if (this.hasToken()) {
      console.log('🔐 Token encontrado. Validando con backend...');
      this.getMe().subscribe({
        next: (user) => {
          console.log('✅ Token válido. Sesión restaurada desde backend:', user.nombre);
        },
        error: (error) => {
          // El interceptor ya maneja el 401 y llama a cleanSession()
          // Aquí solo logueamos para depuración
          if (error.status === 401) {
            console.warn('⚠️ Token rechazado en initializeAuth (401). El interceptor manejará la limpieza.');
          } else {
            // Otros errores (red, CORS, 500, etc.) NO deben cerrar la sesión
            console.error('❌ Error al validar token (no es 401, sesión mantenida):', error);
          }
        }
      });
    } else {
      console.log('ℹ️ No hay token. Usuario no autenticado.');
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
          this._setCurrentUser(response.data.user); // Usar el nuevo nombre
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
          this._setCurrentUser(response.user); // Usar el nuevo nombre
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
        this._setCurrentUser(user); // Usar el nuevo nombre
        if (isPlatformBrowser(this.platformId) && user?.rol) {
          localStorage.setItem(this.ROLE_KEY, user.rol);
        }
      }),
      catchError(error => {
        // NO llamar a cleanSession() aquí - lo maneja el interceptor
        // Solo re-lanzar el error para que initializeAuth() lo capture
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
  
  /**
   * ACTUALIZACIÓN CLAVE: Inyecta el objeto User actualizado en el stream reactivo.
   * Este método es llamado por el componente 'EditarPerfil' después de un PATCH exitoso.
   * @param user El objeto User retornado por el backend (UsuarioController::updateMe).
   */
  public updateUserInState(user: User): void {
      console.log('🔄 Estado del usuario actualizado por el componente de Edición de Perfil.');
      this._setCurrentUser(user);
  }

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

  // Se hace privado y se renombra para que solo sea llamado internamente o por el nuevo método público.
  private _setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    
    // Guardar en localStorage SOLO para UX rápida en próximo refresh
    // El backend sigue siendo la única fuente de verdad
    if (isPlatformBrowser(this.platformId)) {
      if (user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        console.log('💾 Usuario guardado en localStorage (para próximo refresh)');
      } else {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  public cleanSession(): void {
    console.log('🔴 Limpiando sesión completa...');
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.USER_KEY); // Limpia datos del usuario
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    console.log('✅ Sesión limpiada completamente');
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