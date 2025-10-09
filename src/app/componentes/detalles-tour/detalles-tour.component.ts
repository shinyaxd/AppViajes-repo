import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TourService } from '../paginas/tour/services/tour.service';

@Component({
  selector: 'app-detalles-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalles-tour.component.html',
  styleUrls: ['./detalles-tour.component.css']
})
export class DetallesTourComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tourService = inject(TourService);

  tourId: number | null = null;
  tour: any = null;
  eliminando = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('servicio_id');
    this.tourId = idParam ? Number(idParam) : null;
    if (this.tourId) {
      this.cargarTour();
    }
  }

  cargarTour(): void {
    if (!this.tourId) return;
    
    this.tourService.getTourDetalles(this.tourId).subscribe({
      next: (res: any) => { 
        this.tour = res?.tour ?? res; 
      },
      error: (err: any) => console.error(err)
    });
  }

  editarTour(): void {
    if (this.tourId) {
      this.router.navigate(['/editarTour', this.tourId]);
    }
  }

  eliminarTour(): void {
    if (!this.tourId) return;

    const confirmacion = confirm(
      '¿Estás seguro de que quieres eliminar este tour?\n\n' +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmacion) return;

    this.eliminando = true;
    this.tourService.eliminarTour(this.tourId).subscribe({
      next: () => {
        alert('Tour eliminado exitosamente');
        this.router.navigate(['/resultados-tours']);
      },
      error: (err) => {
        this.eliminando = false;
        alert('Error al eliminar el tour. Por favor intenta de nuevo.');
        console.error(err);
      }
    });
  }
}
