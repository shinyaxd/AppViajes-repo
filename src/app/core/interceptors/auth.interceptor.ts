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
          // El 'Accept': 'application/json' está perfecto para tu backend Laravel
          Accept: 'application/json' 
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      // 🔸 Si el token es inválido o expiró
      if (error.status === 401) {
        console.warn('⚠️ Token inválido o expirado. Limpiando sesión local...');
        // ✅ Acceso directo al método, asumiendo que es público
        authService.cleanSession(); 
      }

      // Re-lanza el error para que sea manejado por el componente que hizo la llamada
      return throwError(() => error);
    })
  );
};
