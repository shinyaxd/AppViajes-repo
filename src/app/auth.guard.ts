import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './componentes/paginas/hoteles/services/auth.service';
import { map, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // 🟡 Si no hay usuario logueado, redirigir al login
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      // 🔒 Verificar que el rol sea "proveedor"
      if (user.rol !== 'proveedor') {
        router.navigate(['/']);
        return false;
      }

      // ✅ Usuario autenticado y con rol correcto
      return true;
    }),
    catchError(err => {
      console.error('Error en AuthGuard:', err);
      router.navigate(['/login']);
      return of(false);
    })
  );
};
