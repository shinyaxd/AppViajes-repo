// src/app/componentes/paginas/tours/tour.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BuscadorComponent } from '../../buscador/buscador.component';
import { TourService, TourData } from './services/tour.service'; // <- servicio personalizado de tours

@Component({
  selector: 'app-tour',
  standalone: true,
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.css'], // corregido
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    BuscadorComponent
  ]
})
export class TourComponent implements OnInit {
  toursRecientes: TourData[] = [];
  toursPopulares: TourData[] = [];
  mensajeError: string | null = null;

  private readonly UMBRAL_POPULARIDAD = 4; // por ejemplo, tours con calificación >= 4 son populares

  constructor(
    private tourService: TourService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarToursDesdeApi();
    }
  }

  cargarToursDesdeApi() {
    this.tourService.getTours().subscribe({
      next: (tours: TourData[]) => {
        // Tours recientes (limitados a 4)
        this.toursRecientes = tours.slice(0, 4);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar tours desde la API:', error.message);
        this.mensajeError = 'Ocurrió un error al cargar los tours. Intenta nuevamente.';
      }
    });
  }
}
