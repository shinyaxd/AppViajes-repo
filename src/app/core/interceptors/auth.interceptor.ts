import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // 🔹 Clonamos la petición para agregar el token si existe
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json' 
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      // 🔸 Si el backend rechaza el token (expirado o inválido)
      if (error.status === 401) {
        console.warn('⚠️ Interceptor detectó 401. Limpiando sesión...');
        authService.cleanSession(); // Limpia TODO (token + role + user)
        
        // Solo redirigir si NO estamos ya en la página de login
        if (!router.url.includes('/auth/login')) {
          router.navigate(['/auth/login']);
        }
      }

      // Re-lanza el error para que sea manejado por el componente si es necesario
      return throwError(() => error);
    })
  );
};
