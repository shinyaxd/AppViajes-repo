import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common'; // <-- Importar DOCUMENT
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
  private document = inject(DOCUMENT); // <-- Se inyecta para acceder a document.cookie

  private readonly BASE_ENDPOINT = environment.apiUrl;
  
  // 🔴 CAMBIO: Eliminamos la referencia a TOKEN_KEY. El access_token es HttpOnly.
  // private readonly TOKEN_KEY = 'sanctum_token'; 
  private readonly ROLE_KEY = 'user_role';
  private readonly USER_KEY = 'current_user'; 

  // 🔴 CAMBIO: isAuthenticatedSubject inicia en false y se actualiza solo después de que getMe() sea exitoso.
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
      this.initializeAuth();
    }
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
        console.log('⚡ Datos temporales cargados (pendiente validación con backend):', user.nombre);
      } catch (error) {
        console.error('❌ Error al parsear usuario de localStorage:', error);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  /**
   * Inicializa la autenticación VALIDANDO con el backend.
   * La única forma de validar es intentando llamar a '/auth2/me'.
   */
  private initializeAuth(): void {
    console.log('🔐 Intentando validar sesión con backend (getMe)...');
    
    // 🔴 CAMBIO: Ya no se chequea localStorage. Se intenta la validación directa.
    this.getMe().subscribe({
        next: (user) => {
          console.log('✅ Cookie válida. Sesión restaurada desde backend:', user.nombre);
          this.isAuthenticatedSubject.next(true); 
        },
        error: (error) => {
          // Si falla (ej: 401), el interceptor limpiará, pero aseguramos estado local limpio
          this.cleanSession(); 
          console.log('ℹ️ No hay sesión JWT válida.');
        }
    });
  }

  // ==========================================================
  // CSRF (NUEVO)
  // ==========================================================
  
  /**
   * 🔴 NUEVA FUNCIÓN: Llama a /auth2/csrf para que el backend setee la cookie XSRF-TOKEN.
   * Debe llamarse ANTES de login, register, logout, o cualquier POST/PUT/DELETE.
   */
  public getCSRFToken(): Observable<any> {
      const url = `${this.BASE_ENDPOINT}/auth2/csrf`;
      this.loadingService.show('Obteniendo token de seguridad...');
      // Solo nos importa la acción de la petición para que el navegador guarde la cookie.
      return this.http.get(url).pipe(
        finalize(() => this.loadingService.hide())
      ); 
  }

  /**
   * 🔴 NUEVA FUNCIÓN: Lee el valor de la cookie 'XSRF-TOKEN' para el Interceptor.
   * Se requiere acceso a document.cookie.
   */
  public getCsrfCookieValue(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(this.document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  }

  // ==========================================================
  // REGISTRO
  // ==========================================================
  register(data: RegisterData): Observable<RegisterResponse> {
    // 🔴 CAMBIO: El endpoint de registro puede que no haya cambiado, lo mantenemos como /auth/register
    const url = `${this.BASE_ENDPOINT}/auth/register`; 

    const basePayload = {
      email: data.email,
      password: data.password,
      rol: data.rol,
      device_name: 'WebApp'
    };
    // ... (lógica del payload)
    let payload: any;
    if (data.rol === 'viajero') {
        payload = { ...basePayload, nombre: data.nombre, apellido: data.apellido };
    } else if (data.rol === 'proveedor') {
        payload = { ...basePayload, empresa_nombre: data.empresa_nombre, telefono: data.telefono, ruc: data.ruc };
    } else {
        payload = basePayload;
    }

    this.loadingService.show('Registrando usuario...');

    return this.http.post<RegisterResponse>(url, payload).pipe(
      tap(response => {
        console.log('✅ Registro exitoso:', response.data.user);

        if (response.data?.token && isPlatformBrowser(this.platformId)) {
          // ⚠️ NOTA: Si este endpoint de registro NO devuelve un token, eliminar este if.
          // Si lo devuelve, es probable que use la autenticación antigua (Sanctum) y DEBE ser migrado.
          // Por ahora, se elimina la parte de localStorage.setItem(this.TOKEN_KEY).
          this.isAuthenticatedSubject.next(true);
          this._setCurrentUser(response.data.user); 
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
    // 🔴 CAMBIO: Nueva URL de Login
    const url = `${this.BASE_ENDPOINT}/auth2/login`;
    const payload = { ...credentials, device_name: 'WebApp' };

    this.loadingService.show('Iniciando sesión...');

    // 🔴 CAMBIO: La respuesta ya NO trae el token en el body, solo datos de usuario (data.user).
    return this.http.post<any>(url, payload).pipe( 
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          // 🔴 CAMBIO: ELIMINAMOS la línea que guardaba el token en localStorage.
          
          if (response.data?.user?.rol) {
            localStorage.setItem(this.ROLE_KEY, response.data.user.rol);
          }
          this.isAuthenticatedSubject.next(true);
          this._setCurrentUser(response.data.user); // Usar el campo 'data.user'
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
    // 🔴 CAMBIO: Nueva URL para obtener el perfil
    const url = `${this.BASE_ENDPOINT}/auth2/me`;
    return this.http.get<{ data: User }>(url).pipe(
      map(res => res.data),
      tap(user => {
        this._setCurrentUser(user); 
        if (isPlatformBrowser(this.platformId) && user?.rol) {
          localStorage.setItem(this.ROLE_KEY, user.rol);
        }
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  logout(): Observable<any> {
    // 🔴 CAMBIO: Nueva URL de Logout
    const url = `${this.BASE_ENDPOINT}/auth2/logout`;
    
    this.loadingService.show('Cerrando sesión...');
    
    return this.http.post(url, {}).pipe(
      tap(() => this.cleanSession()),
      // El backend borra la cookie; el frontend solo borra localStorage y estado.
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
  
  public updateUserInState(user: User): void {
      console.log('🔄 Estado del usuario actualizado por el componente de Edición de Perfil.');
      this._setCurrentUser(user);
  }

  public isLoggedIn(): boolean {
    // 🔴 CAMBIO: La única fuente de verdad es el BehaviorSubject (que se actualiza con getMe()).
    return this.isAuthenticatedSubject.value;
  }

  // ... (otros métodos como getRole, isProveedor$, etc. se mantienen igual)

  public getCurrentUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user?.id || null;
  }

  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private _setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    
    if (isPlatformBrowser(this.platformId)) {
      if (user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  public cleanSession(): void {
    console.log('🔴 Limpiando sesión completa...');
    if (isPlatformBrowser(this.platformId)) {
      // 🔴 CAMBIO: Eliminamos la limpieza de TOKEN_KEY.
      // localStorage.removeItem(this.TOKEN_KEY); 
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    console.log('✅ Sesión limpiada completamente');
  }

  // 🔴 CAMBIO: Se eliminan getToken() y hasToken()

  // ==========================================================
  // REFRESH TOKEN (NUEVO)
  // ==========================================================

  /**
   * Llama al endpoint de refresh para obtener una nueva cookie access_token.
   * La petición es manejada por el Interceptor.
   * @returns Observable con la respuesta del backend (solo mensaje de éxito).
   */
  public refresh(): Observable<any> {
    const url = `${this.BASE_ENDPOINT}/auth2/refresh`;
    // La cookie access_token expirada se envía automáticamente y el backend
    // la valida contra el refresh_ttl. Necesita CSRF, que el Interceptor añadirá.
    return this.http.post(url, {}); 
  }

  private handleError(error: HttpErrorResponse, context: string) {
    // ... (lógica de manejo de errores se mantiene igual)
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