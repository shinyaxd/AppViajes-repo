import { Component, signal, OnInit, OnDestroy, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs'; 
import { catchError, filter } from 'rxjs/operators';

// *******************************************************************
// IMPORTACIÓN DE SERVICIOS DE LARAVEL (BACKEND)
// *******************************************************************
import { AuthService, User } from '../paginas/hoteles/services/auth.service';
import { HotelService, HotelData } from '../paginas/hoteles/services/hoteles.service';

// ==========================================================
// INTERFACES Y UTILS
// ==========================================================

/**
 * Define la estructura de un Hotel para el Dashboard (basada en HotelData).
 * NOTA: El campo 'reservas_pendientes' viene directamente del backend de Laravel.
 */
interface DashboardHotel extends HotelData {
  reservas_pendientes: number; // Campo clave que refleja el nombre del backend
}


// PIPE UTILITARIO para renderizar estrellas
@Pipe({
  name: 'starArray',
  standalone: true
})
export class StarArrayPipe implements PipeTransform {
  /** Transforma un número (ej: 4) en un array de ese tamaño ([0, 0, 0, 0]) para usar con @for. */
  transform(value: number): number[] {
    return Array(value).fill(0);
  }
}


// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, StarArrayPipe],
  
  // ******************************************************
  // * SEPARACIÓN DE ARCHIVOS *
  templateUrl: './proveedor.component.html',
  styleUrls: ['./proveedor.component.css'],
  // ******************************************************
  
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedorComponent implements OnInit, OnDestroy {
  // Inyecciones de Servicios
  private router = inject(Router);
  private authService = inject(AuthService);
  private hotelService = inject(HotelService);
  private subscriptions = new Subscription(); // Para limpiar Observables

  // *******************************************************************
  // ESTADO
  // *******************************************************************
  
  user = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(true);
  publications = signal<DashboardHotel[]>([]); // Solo contendrá hoteles

  // Clase CSS dinámica para la tarjeta de hotel
  getPublicationCardClass() {
    const base = "bg-white p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-xl transform hover:scale-[1.005] publication-card";
    // Fija el color de la barra lateral a azul (Hotel)
    const borderColor = 'border-l-4 border-l-blue-500'; 
    return `${base} ${borderColor}`;
  }
  
  // *******************************************************************
  // CICLO DE VIDA
  // *******************************************************************
  ngOnInit(): void {
    // 1. Suscribirse al estado del usuario
    this.subscriptions.add(
      this.authService.currentUser$.pipe(
        // Asegura que solo procesemos después de la carga inicial del token
        filter(user => user !== undefined) 
      ).subscribe(user => {
        this.user.set(user);
        this.isAuthenticated.set(!!user);
        this.isLoading.set(false);
        
        // 2. Si es proveedor, cargar sus hoteles
        if (user && user.rol === 'proveedor') {
          this.fetchPublications();
        } else {
            // No proveedor o no logueado
            this.publications.set([]);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // *******************************************************************
  // MÉTODOS DE DATOS (Backend Laravel)
  // *******************************************************************
  
  /**
   * Llama a HotelService para obtener los hoteles del proveedor logueado.
   */
  fetchPublications(): void {
    if (!this.isAuthenticated() || this.user()?.rol !== 'proveedor') return;

    this.isLoading.set(true);

    this.subscriptions.add(
        this.hotelService.getSupplierHotels().pipe(
            catchError((error) => {
                console.error("Error al cargar hoteles:", error);
                // Si el error es 500, indica que la ruta no existe o falla el backend.
                // En este punto, como corregimos el backend, solo mostramos el error.
                this.publications.set([]);
                this.isLoading.set(false);
                return []; 
            })
        ).subscribe(hotels => {
            // ALINEACIÓN: Mapeamos los datos para asegurar que tienen el campo que espera DashboardHotel.
            // La interfaz DashboardHotel espera 'reservas_pendientes', que es lo que devuelve el backend.
            const hotelsWithReservations: DashboardHotel[] = hotels.map(h => ({
                ...h,
                // Si el backend no devuelve el campo (lo cual no debería pasar ahora), usamos 0.
                reservas_pendientes: (h as any).reservas_pendientes ?? 0,
            }));

            this.publications.set(hotelsWithReservations);
            this.isLoading.set(false);
            console.log(`✅ ${hotelsWithReservations.length} hoteles cargados desde el backend.`);
        })
    );
  }
  
  /**
   * Redirecciona a la vista de edición del hotel.
   */
  editPublication(id: number, type: string): void {
    // Redirección al formulario de edición usando el servicio_id como parámetro de ruta
    this.router.navigate(['/proveedor/editar-hotel', id]);
  }

  /**
   * Elimina un hotel usando el endpoint DELETE /api/hoteles/{servicio_id}.
   */
  deletePublication(id: number, title: string): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar el hotel "${title}" (ID: ${id})? Esta acción es irreversible.`)) {
      return;
    }

    this.isLoading.set(true);
    
    this.subscriptions.add(
        this.hotelService.deleteHotel(id).subscribe({
            next: () => {
                console.log(`✅ Hotel con ID ${id} eliminado correctamente.`);
                // Recargar la lista para reflejar el cambio (llama a fetchPublications)
                this.fetchPublications(); 
            },
            error: (error) => {
                console.error("Error al eliminar el hotel:", error);
                // Mostrar un mensaje de error no intrusivo
                confirm("Error al eliminar el hotel. Revisa la consola y tu conexión.");
                this.isLoading.set(false);
            }
        })
    );
  }

  /**
   * Cierra la sesión.
   */
  logout(): void {
    this.authService.logout().subscribe(() => {
        this.router.navigate(['/login']);
    });
  }
}
