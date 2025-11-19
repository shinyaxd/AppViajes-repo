import { Component, signal, OnInit, OnDestroy, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs'; 
import { catchError, filter } from 'rxjs/operators';

// *******************************************************************
// IMPORTACIÓN DE SERVICIOS DE LARAVEL (BACKEND)
// *******************************************************************
import { AuthService, User } from '../../../../core/services/auth.service';
import { HotelService, HotelData, ServiceData } from '../../../hoteles/services/hoteles.service';
import { ReviewsService } from '../../../../shared/services/reviews.service';

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
// Mostrar al proveedor el promedio de calificación de sus servicios
interface ServiceProveedorData extends ServiceData {
  /** Promedio de calificación calculado en el front */
  promedio_calificacion?: number;
}


// PIPE UTILITARIO para renderizar estrellas
@Pipe({
  name: 'starArray',
  standalone: true
}) 
export class StarArrayPipe implements PipeTransform {
  transform(rating: number | null | undefined): ('full' | 'half' | 'empty')[] {
    if (!rating || rating <= 0) return [];

    const stars: ('full' | 'half' | 'empty')[] = [];
    const rounded = Math.floor(rating);
    const hasHalf = rating - rounded >= 0.25 && rating - rounded < 0.75; // umbral medio

    // Estrellas llenas
    for (let i = 0; i < rounded; i++) {
      stars.push('full');
    }

    // Media estrella
    if (hasHalf) stars.push('half');

    // Estrellas vacías
    while (stars.length < 5) {
      stars.push('empty');
    }

    return stars;
  }
}


// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, StarArrayPipe],
  
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
  private reviewsService = inject(ReviewsService);
  private subscriptions = new Subscription(); // Para limpiar Observables

  // *******************************************************************
  // ESTADO
  // *******************************************************************
  
  user = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(true);
  publications = signal<ServiceProveedorData[]>([]); // Todos los servicios sin restringir a hoteles
  promedioGeneral: number | null = null;
  totalReservas:number |null = null;
  lugarMasPopular: string | null = null;

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
        this.hotelService.getSupplierServices().pipe(
            catchError((error) => {
                console.error("Error al cargar servicios del proveedor:", error);
                // Si el error es 500, indica que la ruta no existe o falla el backend.
                // En este punto, como corregimos el backend, solo mostramos el error.
                this.publications.set([]);
                this.isLoading.set(false);
                return []; 
            })
        ).subscribe((services:ServiceData[]) => {
          // 1. Calcular el total de reservas confirmadas
          this.totalReservas = services.reduce((total, service) => {
            // Aseguramos que la estructura exista y sumamos el valor.
            const confirmadas = service.reservas_totales?.confirmadas ?? 0;
            return total + confirmadas;
          }, 0);
          // 2. Servicio con más reservas lugarMasPopular
          let maxReservas = -1;
          let servicioMasReservado: ServiceData | null = null;
          services.forEach(service => {
            const confirmadas = service.reservas_totales?.confirmadas ?? 0;
                
            // Si este servicio tiene más reservas que el máximo actual
            if (confirmadas > maxReservas) {
              maxReservas = confirmadas;
              servicioMasReservado = service;
            }
          });
          if (servicioMasReservado) {
            this.lugarMasPopular =(servicioMasReservado as ServiceData)?.ciudad ?? 'N/A';
          } else {
            this.lugarMasPopular = 'N/A';
          }

          const servicesExtendidos: ServiceProveedorData[] = services.map(s => ({
            ...s,
            promedio_calificacion: undefined // se llenará después
          }));
          
          this.publications.set(servicesExtendidos);
          this.isLoading.set(false);
          // Cargar promedios de reseñas para cada servicio
          let totalPromedios = 0;
          let serviciosConCalificacion = 0;

          servicesExtendidos.forEach(service => {
            this.reviewsService.getReviewsDataByServicio(service.id).subscribe({
              next: (reviews) => {
                const promedio = this.reviewsService.calcularPromedio(reviews);
                service.promedio_calificacion = promedio;
                this.publications.set([...this.publications()]);
                // Acumular para el promedio general
                if (promedio > 0) {
                  totalPromedios += promedio;
                  serviciosConCalificacion++;
                }
                // Recalcular promedio general
                this.promedioGeneral = serviciosConCalificacion > 0
                  ? parseFloat((totalPromedios / serviciosConCalificacion).toFixed(2))
                  : null;
              },
              error: (err) => {
                console.warn(`No se pudieron cargar reseñas para servicio ${service.id}:`, err);
                service.promedio_calificacion = 0;
              }
            });
          });  
          console.log(`✅ ${services.length} servicios cargados desde el backend.`);
          console.log(services);
        })
    );
  }         
  
  /**
   * Redirecciona a la vista de edición del hotel.
   */
  editPublication(id: number, type: string ): void {
    // Redirección al formulario de edición usando el servicio_id como parámetro de ruta
    //if (!confirm(`¿Estás seguro de que quieres editar el "${type}" (ID: ${id})? Esta acción es irreversible.`)) {
    //  return;
    //}
    if (type === 'hotel') {
      this.router.navigate(['/proveedor/editar-hotel', id]);
    } else if (type === 'tour') {
      this.router.navigate(['/proveedor/editar-tour', id]);
    }
  }

  /**
   * Elimina un hotel usando el endpoint DELETE /api/hoteles/{servicio_id}.
   */
  deletePublication(id: number, title: string): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar el servicio "${title}" (ID: ${id})? Esta acción es irreversible.`)) {
      return;
    }

    this.isLoading.set(true);
    
    this.subscriptions.add(
        this.hotelService.deleteHotel(id).subscribe({
            next: () => {
                console.log(`✅ Servicio con ID ${id} eliminado correctamente.`);
                // Recargar la lista para reflejar el cambio (llama a fetchPublications)
                this.fetchPublications(); 
            },
            error: (error) => {
                console.error("Error al eliminar el servicio:", error);
                // Mostrar un mensaje de error no intrusivo
                confirm("Error al eliminar el servicio. Revisa la consola y tu conexión.");
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
