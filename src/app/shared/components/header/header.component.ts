import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
// Ruta ajustada. Si esto falla, por favor verifica la estructura de carpetas
// donde está el archivo header.component.ts y la carpeta 'core'.
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  // Mantenemos las referencias a archivos externos
  templateUrl: './header.component.html', 
  styleUrls: ['./header.component.css'] 
})
// Eliminamos OnInit y OnDestroy, ya que no son necesarios con el 'async' pipe.
export class HeaderComponent {
  // ======================================================
  // 🧱 Inyección de dependencias
  // ======================================================
  private authService = inject(AuthService);
  private router = inject(Router);

  // ======================================================
  // 🧩 Propiedades de Estado (Observables)
  // Usamos 'readonly' para indicar que estas referencias no cambiarán.
  // ======================================================
  
  public readonly isAuthenticated$ = this.authService.isAuthenticated$;
  public readonly currentUser$ = this.authService.currentUser$;

  // Observable derivado: Emite TRUE si el usuario logueado tiene el rol 'proveedor'.
  public readonly isProveedor$: Observable<boolean> = this.currentUser$.pipe(
    map(user => user?.rol === 'proveedor') 
  );
  
  /**
   * Observable que determina qué nombre mostrar en el encabezado (Empresa, Personal o Email).
   */
  public readonly userDisplay$: Observable<string> = this.currentUser$.pipe(
    map((user: User | null) => {
      if (!user) return 'Usuario';

      if (user.rol === 'proveedor') {
        // Prioridad para proveedores: Nombre de la empresa > Nombre personal > Email
        return user.empresa_nombre || user.email;
      } else {
        // Prioridad para viajeros: Nombre personal > Email
        return user.nombre || user.email;
      }
    })
  );

  // ======================================================
  // 📤 Métodos
  // ======================================================

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    // La suscripción se cierra automáticamente al completarse o emitir un error
    this.authService.logout().subscribe({
      next: () => {
        // Redirigir a la página de inicio/hoteles al cerrar sesión
        this.router.navigate(['/hoteles']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        // En caso de error de red durante el logout, la sesión local ya se limpió,
        // así que igualmente redirigimos al usuario.
        this.router.navigate(['/hoteles']);
      }
    });
  }
}