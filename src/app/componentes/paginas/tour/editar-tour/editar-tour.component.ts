import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TourService, TourDetalles } from '../services/tour.service';

@Component({
  selector: 'app-editar-tour',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-tour.component.html',
  styleUrl: './editar-tour.component.css'
})
export class EditarTourComponent implements OnInit {
  private tourService = inject(TourService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  tour: TourDetalles | null = null;
  cargando = false;
  error = '';
  guardando = false;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.cargarTour(id);
    }
  }

  cargarTour(id: number) {
    this.cargando = true;
    this.tourService.getTourDetalles(id).subscribe({
      next: (data) => {
        this.tour = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el tour';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  guardarCambios() {
    if (!this.tour) return;

    this.guardando = true;
    this.error = '';

    // Preparar datos para enviar
    const datosActualizados = {
      nombre: this.tour.nombre,
      ciudad: this.tour.ciudad,
      pais: this.tour.pais,
      descripcion: this.tour.descripcion,
      imagen_url: this.tour.imagen_url
    };

    this.tourService.actualizarTour(this.tour.id, datosActualizados).subscribe({
      next: (tourActualizado) => {
        this.guardando = false;
        alert('¡Tour actualizado exitosamente!');
        this.router.navigate(['/detallesTour', this.tour!.id]);
      },
      error: (err) => {
        this.guardando = false;
        this.error = 'Error al guardar los cambios';
        console.error(err);
      }
    });
  }

  cancelar() {
    if (this.tour) {
      this.router.navigate(['/detallesTour', this.tour.id]);
    } else {
      this.router.navigate(['/resultados-tours']);
    }
  }
}
