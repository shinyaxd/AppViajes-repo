import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
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
      // 🔸 Si el token es inválido o expiró
      if (error.status === 401) {
        console.warn('⚠️ Token inválido o expirado. Limpiando sesión local...');
        authService['cleanSession'](); // llamamos el método sincrónico sin suscribirnos
      }

      return throwError(() => error);
    })
  );
};
