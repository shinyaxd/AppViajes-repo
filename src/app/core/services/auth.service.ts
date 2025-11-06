import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
// switchMap es CRUCIAL para encadenar CSRF antes de Login/Logout/Refresh/Register
import { tap, catchError, map, finalize, switchMap } from 'rxjs/operators'; 
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

export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RegisterResponse
};

/**
 * Interface para la respuesta simple de /auth/csrf 
 */
interface CsrfResponse {
  csrf_token: string;
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
  private loadingService = inject(LoadingService);

  private readonly BASE_ENDPOINT = environment.apiUrl;
  private readonly ROLE_KEY = 'user_role';
  private readonly USER_KEY = 'current_user'; // Datos temporales del usuario

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasLocalUser());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Nuevo: Almacena el token CSRF para que el AuthInterceptor lo pueda leer
  private csrfToken: string | null = null;
  public getCsrfTokenValue(): string | null {
    return this.csrfToken;
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  // ==========================================================
  // CSRF (FUNCIÓN CLAVE PARA AUTENTICACIÓN Y MUTACIONES)
  // ==========================================================
  /**
   * Obtiene la cookie 'XSRF-TOKEN' y guarda el valor del token en memoria.
   * La RUTA es '/auth/csrf' según tu api.php.
   */
  public getCsrfToken(): Observable<CsrfResponse> {
    // 🚨 RUTA CORREGIDA: /auth/csrf
    const url = `${this.BASE_ENDPOINT}/auth/csrf`; 
    console.log('🔄 Solicitando cookie CSRF...');
    // El AuthInterceptor se encarga de withCredentials
    return this.http.get<CsrfResponse>(url).pipe(
      tap(response => {
        this.csrfToken = response.csrf_token;
        console.log('✅ Token CSRF guardado en AuthService.');
      }),
      catchError(error => {
        console.error('❌ Error al obtener CSRF token:', error);
        return throwError(() => new Error('Error de seguridad al obtener CSRF token.'));
      })
    );
  }

  // ==========================================================
  // INICIALIZACIÓN DE SESIÓN
  // ==========================================================
  
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem(this.USER_KEY);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true); 
        console.log('⚡ Datos temporales cargados (pendiente validación con backend):', user.nombre);
      } catch (error) {
        console.error('❌ Error al parsear usuario de localStorage:', error);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  /**
   * Este método debe ser llamado desde un punto seguro (ej: AppComponent.ngOnInit)
   * para evitar el error de dependencia circular.
   */
  public initializeAuth(): void { 
    if (this.hasLocalUser()) {
      console.log('🔐 Posible sesión encontrada. Validando con backend (vía cookie JWT)...');
      // getMe() es un GET, no requiere CSRF
      this.getMe().subscribe({
        next: (user) => {
          // 🚨 RUTA CORREGIDA EN EL LOG: /auth/me
          console.log('✅ Cookie JWT válida. Sesión restaurada desde /auth/me:', user.nombre);
          this.isAuthenticatedSubject.next(true);
        },
        error: (error) => {
          if (error.status === 401) {
            console.warn('⚠️ Cookie JWT rechazada (401). Limpiando sesión local.');
            this.cleanSession(); 
          } else {
            console.error('❌ Error al validar sesión (no es 401, sesión mantenida):', error);
          }
        }
      });
    } else {
      console.log('ℹ️ No hay datos locales. Usuario no autenticado.');
    }
  }

  // ==========================================================
  // REGISTRO (Actualizado para CSRF)
  // ==========================================================
  register(data: RegisterData): Observable<RegisterResponse> { 
    // 🚨 RUTA CORREGIDA: /auth/register
    const url = `${this.BASE_ENDPOINT}/auth/register`; 
    
    // 1. Obtener el CSRF token primero (Registro es un POST)
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de registro
      switchMap(() => {
        const basePayload = {
          email: data.email,
          password: data.password,
          rol: data.rol,
        };

        let payload: any;
        if (data.rol === 'viajero') {
          payload = { ...basePayload, nombre: data.nombre, apellido: data.apellido };
        } else if (data.rol === 'proveedor') {
          payload = { ...basePayload, empresa_nombre: data.empresa_nombre, telefono: data.telefono, ruc: data.ruc };
        } else {
          payload = basePayload;
        }

        this.loadingService.show('Registrando usuario...');

        // 3. Ejecutar el registro (El AuthInterceptor adjuntará el X-XSRF-TOKEN)
        return this.http.post<RegisterResponse>(url, payload).pipe(
          tap(response => {
            console.log('✅ Registro OK. Cookie HttpOnly recibida.', response);
            
            // Si el backend hace autologin:
            const user = response.data?.user; // El backend envía { message, expires_in, data: { user } }
            if (isPlatformBrowser(this.platformId) && user) {
              this.isAuthenticatedSubject.next(true);
              this._setCurrentUser(user);
            }
          }),
          catchError((error: HttpErrorResponse) => this.handleError(error, 'registro')),
          finalize(() => this.loadingService.hide())
        );
      })
    );
  }

  // ==========================================================
  // LOGIN (Actualizado para CSRF y rutas)
  // ==========================================================
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // 1. Obtener el CSRF token primero (Login es un POST)
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de login
      switchMap(() => {
        // 🚨 RUTA CORREGIDA: /auth/login
        const url = `${this.BASE_ENDPOINT}/auth/login`; 
        
        this.loadingService.show('Iniciando sesión...');

        // 3. Ejecutar el login (El AuthInterceptor adjuntará el X-XSRF-TOKEN)
        return this.http.post<AuthResponse>(url, credentials).pipe(
          tap(response => {
            console.log('✅ Login OK. Cookie HttpOnly recibida.', response);

            // 🚨 ADAPTACIÓN AL NUEVO MODELO: Los datos están en 'data.user'
            const user = response.data.user; 
            if (isPlatformBrowser(this.platformId) && user) {
              this.isAuthenticatedSubject.next(true);
              this._setCurrentUser(user);
            }
          }),
          catchError((error: HttpErrorResponse) => this.handleError(error, 'inicio de sesión')),
          finalize(() => this.loadingService.hide())
        );
      })
    );
  }

  // ==========================================================
  // PERFIL (Ruta y datos corregidos)
  // ==========================================================
  getMe(): Observable<User> {
    // 🚨 RUTA CORREGIDA: /auth/me
    const url = `${this.BASE_ENDPOINT}/auth/me`; 
    // El backend responde { data: User }
    return this.http.get<{ data: User }>(url).pipe(
      map(res => res.data),
      tap(user => {
        this._setCurrentUser(user);
      }),
      catchError(error => {
        // Se relanza el error para que initializeAuth() pueda manejar el 401
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // LOGOUT (Actualizado para CSRF y rutas)
  // ==========================================================
  logout(): Observable<any> {
    // 1. Obtener el CSRF token primero (Logout es un POST)
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de logout
      switchMap(() => {
        // 🚨 RUTA CORREGIDA: /auth/logout
        const url = `${this.BASE_ENDPOINT}/auth/logout`; 
        
        this.loadingService.show('Cerrando sesión...');
        
        // 3. Ejecutar el logout (El AuthInterceptor adjuntará el X-XSRF-TOKEN)
        return this.http.post(url, {}).pipe(
          tap(() => this.cleanSession()),
          catchError(error => {
            console.warn('⚠️ Error cerrando sesión, limpiando local.', error);
            // Limpia la sesión local incluso si el backend falla (para no quedar en estado zombie)
            this.cleanSession(); 
            return of(null);
          }),
          finalize(() => this.loadingService.hide())
        );
      })
    );
  }

  // ==========================================================
  // REFRESCAR TOKEN (Actualizado para CSRF y rutas)
  // ==========================================================
  refresh(): Observable<any> { 
    // 1. Obtener el CSRF token primero (Refresh es un POST)
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de refresh
      switchMap(() => {
        // 🚨 RUTA CORREGIDA: /auth/refresh
        const url = `${this.BASE_ENDPOINT}/auth/refresh`; 
        console.log('🔄 Solicitando refresh de token...');
        
        // 3. Ejecutar el refresh (El AuthInterceptor adjuntará el X-XSRF-TOKEN)
        return this.http.post(url, {}).pipe( 
            tap(() => {
                console.log('✅ Token JWT refrescado con éxito.');
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('❌ Error en refresh:', error); 
                if (error.status === 401) {
                    this.cleanSession();
                }
                return throwError(() => error);
            })
        );
      })
    );
  }

  // ==========================================================
  // UTILIDADES
  // ==========================================================
  
  public updateUserInState(user: User): void {
      console.log('🔄 Estado del usuario actualizado por el componente de Edición de Perfil.');
      this._setCurrentUser(user);
  }

  public isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
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

  public getCurrentUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user?.id || null;
  }

  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private _setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    
    // Guardar en localStorage SOLO para UX rápida en próximo refresh
    if (isPlatformBrowser(this.platformId)) {
      if (user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        localStorage.setItem(this.ROLE_KEY, user.rol || ''); // Guarda el rol
        console.log('💾 Usuario y Rol guardados en localStorage');
      } else {
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.ROLE_KEY);
      }
    }
  }

  public cleanSession(): void {
    console.log('🔴 Limpiando sesión completa...');
    if (isPlatformBrowser(this.platformId)) {
      // SOLO eliminamos datos locales, NO el token (es HttpOnly)
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.USER_KEY); 
      this.csrfToken = null; // Limpiar también el token CSRF en memoria
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    console.log('✅ Sesión limpiada completamente');
  }

  private hasLocalUser(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem(this.USER_KEY);
  }

  private handleError(error: HttpErrorResponse, context: string) {
    console.error(`❌ Error durante ${context}:`, error);
    let message = 'Ocurrió un error inesperado.';

    if (error.status === 0) {
      message = 'No se puede conectar con el servidor.';
    } else if (error.status === 401) {
      message = error.error?.message || 'Credenciales incorrectas.';
    } else if (error.status === 403) {
      message = error.error?.message || 'Permiso denegado. Error de seguridad (CSRF).';
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