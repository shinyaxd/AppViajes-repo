import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
// Se agrega switchMap para encadenar la petición CSRF antes del login/logout
import { tap, catchError, map, finalize, switchMap } from 'rxjs/operators'; // Se elimina 'concatMap'
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ¡ATENCIÓN! Asegúrate de que AuthResponse refleje el nuevo formato del backend
// { expires_in, data: { user } }
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

/**
 * Interface para la respuesta simple de /auth2/csrf (aunque el valor importante es la cookie)
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
  // TOKEN_KEY ha sido removido ya que el access_token es HttpOnly.
  private readonly ROLE_KEY = 'user_role';
  private readonly USER_KEY = 'current_user'; // Datos temporales del usuario

  // La autenticación ahora se basa en la existencia de un usuario local validado por el backend
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasLocalUser());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
      
      // 🚨 CORRECCIÓN CLAVE: Eliminar la llamada initializeAuth() del constructor.
      // Esto previene el error NG0200 de dependencia circular.
      // La llamada se MOVERÁ a un lugar donde el DI ya haya terminado (ej: AppComponent.ngOnInit)
      // Inicializa y VALIDA con el backend usando la cookie HttpOnly
      // this.initializeAuth(); 
    }
  }

  // ==========================================================
  // CSRF (FUNCIÓN CLAVE PARA auth2)
  // ==========================================================
  /**
   * Obtiene la cookie 'XSRF-TOKEN' (No-HttpOnly) del backend.
   * Esto debe ejecutarse ANTES de cualquier POST, PUT, PATCH o DELETE 
   * que requiera protección CSRF (ej: login, logout).
   */
  public getCsrfToken(): Observable<CsrfResponse> {
    const url = `${this.BASE_ENDPOINT}/auth2/csrf`;
    console.log('🔄 Solicitando cookie CSRF...');
    // El AuthInterceptor se encarga de 'withCredentials: true'
    return this.http.get<CsrfResponse>(url).pipe(
      tap(() => console.log('✅ Cookie XSRF-TOKEN recibida.')),
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
  public initializeAuth(): void { // 🚨 CAMBIO: Puede ser público para llamarlo desde AppComponent
    if (this.hasLocalUser()) {
      console.log('🔐 Posible sesión encontrada. Validando con backend (vía cookie JWT)...');
      this.getMe().subscribe({
        next: (user) => {
          console.log('✅ Cookie JWT válida. Sesión restaurada desde /auth2/me:', user.nombre);
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
  // REGISTRO (Se asume que la ruta /auth/register se mantiene)
  // ==========================================================
  // 💡 El tipo de retorno vuelve a ser RegisterResponse, no User
  register(data: RegisterData): Observable<RegisterResponse> { 
    const url = `${this.BASE_ENDPOINT}/auth/register`;
    // Lógica de payload original (ajusta si es necesario para tu backend)
    const basePayload = {
      email: data.email,
      password: data.password,
      rol: data.rol,
      device_name: 'WebApp'
    };

    let payload: any;
    // ... (Tu lógica para construir payload)
    if (data.rol === 'viajero') {
      payload = { ...basePayload, nombre: data.nombre, apellido: data.apellido };
    } else if (data.rol === 'proveedor') {
      payload = { ...basePayload, empresa_nombre: data.empresa_nombre, telefono: data.telefono, ruc: data.ruc };
    } else {
      payload = basePayload;
    }


    this.loadingService.show('Registrando usuario...');

    return this.http.post<RegisterResponse>(url, payload).pipe(
      tap(() => {
        // 🚨 CRUCIAL: Eliminamos la actualización de estado para evitar el autologin.
        console.log('✅ Registro exitoso. Cookie de sesión establecida, pero NO se actualiza el estado local.');
      }),
      // 🚨 CRUCIAL: Eliminamos el concatMap(() => this.getMe()) para que no se autologee.
      catchError((error: HttpErrorResponse) => {
        this.loadingService.hide();
        return this.handleError(error, 'registro'); // Contexto de error simple
      }),
      finalize(() => this.loadingService.hide())
    );
  }

  // ==========================================================
  // LOGIN (Actualizado para /auth2 y CSRF)
  // ==========================================================
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // 1. Obtener el CSRF token primero
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de login
      switchMap(() => {
        const url = `${this.BASE_ENDPOINT}/auth2/login`; // <<< RUTA ACTUALIZADA
        // device_name ya no es relevante en el flujo JWT/Cookie
        
        this.loadingService.show('Iniciando sesión...');

        // 3. Ejecutar el login (el AuthInterceptor adjuntará el X-XSRF-TOKEN)
        return this.http.post<AuthResponse>(url, credentials).pipe(
          tap(response => {
            console.log('✅ Login OK. Cookie HttpOnly recibida.', response);

            // ADAPTACIÓN AL NUEVO MODELO: Los datos están en 'data.user'
            const user = response.data.user; 
            if (isPlatformBrowser(this.platformId) && user) {
              if (user.rol) {
                localStorage.setItem(this.ROLE_KEY, user.rol);
              }
              // Aquí sí se inicia sesión
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
  // PERFIL (Actualizado para /auth2)
  // ==========================================================
  getMe(): Observable<User> {
    const url = `${this.BASE_ENDPOINT}/auth2/me`; // <<< RUTA ACTUALIZADA
    // El backend responde { data: User }
    return this.http.get<{ data: User }>(url).pipe(
      map(res => res.data),
      tap(user => {
        this._setCurrentUser(user);
        if (isPlatformBrowser(this.platformId) && user?.rol) {
          localStorage.setItem(this.ROLE_KEY, user.rol);
        }
      }),
      catchError(error => {
        // Se relanza el error para que initializeAuth() pueda manejar el 401
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // LOGOUT (Actualizado para /auth2 y CSRF)
  // ==========================================================
  logout(): Observable<any> {
    // 1. Obtener el CSRF token primero
    return this.getCsrfToken().pipe(
      // 2. Encadenar la petición de logout
      switchMap(() => {
        const url = `${this.BASE_ENDPOINT}/auth2/logout`; // <<< RUTA ACTUALIZADA
        
        this.loadingService.show('Cerrando sesión...');
        
        // 3. Ejecutar el logout (el AuthInterceptor adjuntará el X-XSRF-TOKEN)
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
  // REFRESCAR TOKEN
  // ==========================================================
  /**
   * Solicita un nuevo JWT al backend usando la cookie existente.
   * Se usa para mantener la sesión activa sin que el usuario lo note.
   */
  refresh(): Observable<any> { 
      const url = `${this.BASE_ENDPOINT}/auth2/refresh`;
      console.log('🔄 Solicitando refresh de token...');
      
      // Si esperas un cuerpo de respuesta (incluso vacío), HttpClient.get() devuelve Observable<Object>
      return this.http.get(url).pipe( 
          tap(() => {
              console.log('✅ Token JWT refrescado con éxito.');
          }),
          catchError((error: HttpErrorResponse) => {
              console.error('❌ Error en refresh:', error); // 🚨 LOG DETALLADO
              // ... (el manejo de errores se mantiene igual)
              if (error.status === 401) {
                  this.cleanSession();
              }
              // Aseguramos que cualquier error (401, 500, etc.) se relanza para detener la cadena en el componente
              return throwError(() => error);
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
        console.log('💾 Usuario guardado en localStorage (para próximo refresh)');
      } else {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  

  public cleanSession(): void {
    console.log('🔴 Limpiando sesión completa...');
    if (isPlatformBrowser(this.platformId)) {
      // SOLO eliminamos datos locales, NO el token (es HttpOnly)
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.USER_KEY); 
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    console.log('✅ Sesión limpiada completamente');
  }

  // Reemplazamos hasToken() por hasLocalUser()
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
