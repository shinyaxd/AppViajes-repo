import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './componentes/paginas/hoteles/services/auth.service';
import { map, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs'; // Necesario para 'of(false)'

/**
 * Guardia que solo permite el acceso a usuarios autenticados con el rol 'viajero'.
 */
export const viajeroGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Usamos el observable currentUser$ para asegurarnos de que el usuario se ha cargado.
  // take(1) asegura que solo se ejecute una vez.
  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // 1. Si no hay usuario (no logueado), redirigir al login.
      if (!user) {
        // Redirigir al login, guardando la URL para volver después.
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }

      // 2. Si hay usuario, verificar que el rol sea 'viajero'.
      if (user.rol === 'viajero') {
        // ✅ Usuario autenticado y es viajero
        return true;
      } else {
        // ❌ Usuario autenticado, pero NO es viajero (ej: es proveedor). Redirigir a la raíz.
        router.navigate(['/']);
        return false;
      }
    }),
    // Manejo de errores durante la carga del usuario (aunque es poco común aquí)
    catchError(err => {
      console.error('Error en ViajeroGuard, forzando cierre de sesión:', err);
      authService.cleanSession(); // Limpiamos si hay un error grave de token/API
      router.navigate(['/login']);
      return of(false);
    })
  );
};