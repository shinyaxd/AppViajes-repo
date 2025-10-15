import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, map, Observable } from 'rxjs'; 
import { AuthService, User } from '../../../core/services/auth.service';

// Asegúrate de que la ruta al AuthService sea correcta en tu proyecto
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule], 
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // ======================================================
  // 🧱 Inyección de dependencias
  // ======================================================
  private authService = inject(AuthService);
  private router = inject(Router);

  // ======================================================
  // 🧩 Propiedades de Estado (Observables)
  // Se usan directamente con el 'async' pipe en el HTML.
  // ======================================================
  
  // Observable que mantiene el estado de autenticación (true/false)
  isAuthenticated$ = this.authService.isAuthenticated$;
  
  // Observable del objeto de usuario completo
  currentUser$ = this.authService.currentUser$;

  // Observable derivado: Emite TRUE si el usuario logueado tiene el rol 'proveedor'.
  isProveedor$: Observable<boolean> = this.currentUser$.pipe(
    map(user => user?.rol === 'proveedor') 
  );
  
  // Variable para guardar el usuario al que nos suscribimos (necesario si no usas async pipe)
  currentUser: User | null = null;
  
  private subscriptions = new Subscription();

  // ======================================================
  // 🚀 Inicialización
  // ======================================================
  ngOnInit(): void {
    // Única suscripción necesaria: Obtener el objeto de usuario.
    // Usar 'async' pipe en el HTML es preferible, pero esta suscripción es aceptable 
    // si el componente necesita el objeto de forma imperativa.
    const userSub = this.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // ⚠️ Se elimina la lógica de 'getMe()' aquí. 
    // El AuthService (en su constructor) ya es responsable de cargar el perfil 
    // si detecta un token al iniciar la aplicación.
    
    this.subscriptions.add(userSub);
  }

  // ======================================================
  // 📤 Métodos
  // ======================================================

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Navegar a la página de inicio/hoteles al cerrar sesión
        this.router.navigate(['/hoteles']);
      },
      error: () => {
        // En caso de error de red durante el logout, la sesión local ya se limpió,
        // así que igualmente redirigimos al usuario.
        this.router.navigate(['/hoteles']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
