import { 
  HttpInterceptorFn, 
  HttpRequest, 
  HttpHandlerFn,
  HttpXsrfTokenExtractor, // <-- Necesario para leer la cookie XSRF-TOKEN
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Asegúrate de que la ruta sea correcta
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor para el nuevo flujo JWT/Cookie:
 * 1. Habilita el envío/recepción de cookies (withCredentials).
 * 2. Adjunta el header X-XSRF-TOKEN si es un método de cambio de estado (CSRF Double-Submit).
 * 3. Maneja el error 401 (Token rechazado) limpiando la sesión y redirigiendo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // HttpXsrfTokenExtractor de Angular lee automáticamente la cookie 'XSRF-TOKEN'
  const tokenExtractor = inject(HttpXsrfTokenExtractor); 

  // --- PARTE 1: Configuración de Credenciales (Cookies) y CSRF ---
  
  // Clonar la petición base
  let authReq: HttpRequest<unknown> = req.clone({
    // 🔹 CRÍTICO: Habilitar el envío y recepción de cookies (para JWT HttpOnly y XSRF-TOKEN)
    withCredentials: true, 
    // Mantenemos el Accept: application/json
    setHeaders: {
      Accept: 'application/json' 
    }
  });

  // 🔹 Lógica CSRF: Adjuntar el header X-XSRF-TOKEN
  const isStateChangingMethod = 
    authReq.method === 'POST' || 
    authReq.method === 'PUT' || 
    authReq.method === 'PATCH' || 
    authReq.method === 'DELETE';

  if (isStateChangingMethod) {
    const csrfToken = tokenExtractor.getToken(); 

    if (csrfToken) {
      // Si tenemos un token y es un método de cambio de estado, lo adjuntamos como header.
      // Angular fusiona headers, por lo que el Accept se mantiene.
      authReq = authReq.clone({
        setHeaders: {
          'X-XSRF-TOKEN': csrfToken, // Header que Laravel/Lumen espera
        },
      });
      console.log(`🔒 CSRF Header adjuntado para ${authReq.method} ${authReq.url}`);
    } else {
      // Este warning indica que /auth/csrf no fue llamado antes de una mutación (ej: login)
      console.warn(`⚠️ CSRF Token faltante para ${authReq.method} ${authReq.url}. La petición podría fallar con 403.`);
    }
  }


  // --- PARTE 2: Manejo de Errores (401) ---

  return next(authReq).pipe(
    catchError((error) => {
      // 🔸 Si el backend rechaza la cookie JWT (401 Unauthorized)
      if (error.status === 401) {
        console.warn('⚠️ Interceptor detectó 401 (Cookie JWT inválida). Limpiando sesión local...');
        
        // Limpia datos locales (User, Role)
        authService.cleanSession(); 
        
        // 🚨 CORRECCIÓN: Usar solo la ruta corregida /auth/login
        if (!router.url.includes('/auth/login')) {
          router.navigate(['/auth/login']);
        }
      }

      // Re-lanza el error para que sea manejado por el componente si es necesario
      return throwError(() => error);
    })
  );
};