import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, filter, take, tap } from 'rxjs/operators';
import { throwError, Observable, of, BehaviorSubject, NEVER } from 'rxjs';

// Variable global (o de servicio) para controlar si ya estamos en proceso de refresh
// Usamos un BehaviorSubject para que las peticiones en cola esperen.
const isRefreshingToken = new BehaviorSubject<boolean>(false);
const refreshTokenSubject = new BehaviorSubject<any>(null);


export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // === PASO 1 y 2: Clonar con withCredentials y CSRF ===

  // 1. 🔑 Clonar la petición para agregar 'withCredentials: true'
  let authReq: HttpRequest<any> = req.clone({
    withCredentials: true,
  });
  
  // 2. 🛡️ Implementación del CSRF Doble-Submit (Solo para métodos que cambian estado)
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = authService.getCsrfCookieValue(); 
    if (csrfToken) {
        authReq = authReq.clone({
            setHeaders: {
                'X-XSRF-TOKEN': csrfToken,
            }
        });
    } else {
        // En un caso real, esto puede ser un error crítico que el componente deba manejar.
        console.error('❌ CSRF Token faltante en petición POST/PUT/PATCH/DELETE.');
    }
  }
  
  // === PASO 3: Ejecutar la petición y manejar errores ===

  return next(authReq).pipe(
    catchError((error) => {
      // 🔸 Si el error es 401, y NO es la petición de REFRESH (para evitar bucles)
      if (error.status === 401 && !authReq.url.includes('/auth2/refresh')) {
        
        // 4. 🔄 Lógica de Refresh Token
        
        if (!isRefreshingToken.value) {
          // 4a. Primera petición 401: Iniciar el proceso de refresh
          isRefreshingToken.next(true);
          refreshTokenSubject.next(null);
          console.log('⚠️ 401 detectado. Iniciando proceso de refresh...');
          
          // Llamamos al servicio para refrescar (endpoint: /auth2/refresh)
          return authService.refresh().pipe(
            switchMap((res: any) => {
              // Refresh exitoso: El backend seteó la nueva cookie 'access_token'.
              isRefreshingToken.next(false);
              // Notificamos a las peticiones en cola (refreshTokenSubject) que hay nuevo token.
              refreshTokenSubject.next(true); 
              
              // Reintentar la petición original con la nueva cookie.
              return next(authReq.clone({
                // Clonamos de nuevo con withCredentials para seguridad, aunque ya lo tiene.
                withCredentials: true 
              }));
            }),
            catchError((refreshError) => {
              // Refresh fallido (401 o cualquier error): El refresh_ttl ha expirado.
              console.error('❌ Refresh Token fallido. Expiración total.', refreshError);
              
              isRefreshingToken.next(false);
              authService.cleanSession();
              
              // Redirigir al login y detener la propagación del error.
              if (!router.url.includes('/auth/login')) {
                  router.navigate(['/auth/login']);
                  return NEVER; // Detiene la cadena de Observables
              }
              return throwError(() => refreshError);
            })
          );
        } else {
          // 4b. Peticiones 401 en cola: Esperar a que el refresh termine.
          return refreshTokenSubject.pipe(
            filter(token => token != null),
            take(1),
            switchMap(() => {
              // El refresh terminó (exitoso), reintentar la petición original.
              return next(authReq.clone({
                withCredentials: true
              }));
            })
          );
        }
      }
      
      // 5. 🔸 Manejo de error 403 (Forbidden, a menudo por CSRF fallido)
      // Si el 403 ocurre por CSRF, el usuario DEBE llamar a /auth2/csrf antes del POST.
      if (error.status === 403) {
        console.error('❌ Interceptor detectó 403 (CSRF o permisos). No se limpia la sesión.');
      }
      
      // 6. Si es cualquier otro error (incluyendo 401 que no es de refresh, o 403), relanzarlo.
      return throwError(() => error);
    })
  );
};