import { Component, inject, HostListener } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
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
  // Controla si el dropdown está abierto por click
  public menuOpen = false;

  // Alterna el estado del menú (se invoca desde el botón)
  toggleMenu(ev?: MouseEvent) {
    ev?.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  // Cierra el menú (usado desde HostListener al click fuera o Escape)
  closeMenu() {
    this.menuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_ev: MouseEvent) {
    // Si hay un click en cualquier parte del documento, cerramos el menú
    if (this.menuOpen) this.closeMenu();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(_ev: Event) {
    if (this.menuOpen) this.closeMenu();
  }
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

  // Indica si la ruta actual es /mis-reservas (útil para desactivar el enlace)
  public isOnMisReservas = false;

  constructor() {
    // Inicializamos el flag y escuchamos cambios de navegación
    try {
      this.isOnMisReservas = this.router.url?.startsWith('/mis-reservas') ?? false;
      this.router.events.subscribe(ev => {
        if (ev instanceof NavigationEnd) {
          this.isOnMisReservas = ev.urlAfterRedirects?.startsWith('/mis-reservas');
        }
      });
    } catch (err) {
      // En ambientes de testing o SSR la router puede no estar listo; ignoramos fallos silenciosamente
      console.warn('No se pudo inicializar watcher de ruta en HeaderComponent', err);
    }
  }

  /** Devuelve la URL del avatar, usando campos adicionales si el backend los provee */
  public getAvatar(user: User | null): string {
    if (!user) return '/public/img/imagen.jpg';
    const anyUser = user as any;
    return anyUser?.imagen || anyUser?.avatar || '/public/img/imagen.jpg';
  }

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