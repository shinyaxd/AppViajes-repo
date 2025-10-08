import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../paginas/hoteles/services/auth.service';

// Asegúrate de que la ruta al AuthService sea correcta en tu proyecto
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule], 
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Inyección de dependencias
  private authService = inject(AuthService);
  private router = inject(Router);

  // Observable que mantiene el estado de autenticación (true/false)
  isAuthenticated$ = this.authService.isAuthenticated$;
  
  // Usamos el observable directamente para que el HTML se actualice automáticamente.
  currentUser$ = this.authService.currentUser$;
  
  // Variable para guardar el usuario al que nos suscribimos.
  currentUser: User | null = null;
  
  private subscriptions = new Subscription();

  ngOnInit(): void {
    // Suscripción CLAVE: Usamos subscribe para que 'currentUser' tenga el valor sin el pipe | async
    // y lo usamos solo para lógica si es necesario, aunque el HTML usará el pipe | async.
    const userSub = this.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Lógica para cargar el perfil solo si hay token pero el usuario no ha sido cargado (ej. al recargar la página).
    const authSub = this.isAuthenticated$.subscribe(isAuthenticated => {
      // Intentamos cargar el perfil solo si estamos autenticados y el usuario AÚN no está en la memoria (null)
      if (isAuthenticated && !this.currentUser) {
        this.authService.getMe().subscribe({
          next: () => {
            console.log('✅ Perfil cargado automáticamente.');
            // El tap dentro de getMe ya actualiza el currentUserSubject.
          },
          error: (err) => {
            console.warn('⚠️ Fallo al cargar /auth/me. Forzando logout.', err);
            // Si el token es inválido, el getMe ya llama a cleanSession/logout.
          }
        });
      }
    });

    this.subscriptions.add(userSub);
    this.subscriptions.add(authSub);
  }

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/hoteles']);
      },
      error: () => {
        // En caso de error de red, la sesión local ya se limpió
        this.router.navigate(['/hoteles']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
