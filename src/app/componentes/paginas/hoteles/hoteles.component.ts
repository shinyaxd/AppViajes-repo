// src/app/componentes/hoteles/hoteles.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BuscadorComponent } from '../../buscador/buscador.component';
import { HotelService, HotelData } from './services/hoteles.service';

@Component({
  selector: 'app-hoteles',
  standalone: true,
  templateUrl: './hoteles.component.html',
  styleUrls: ['./hoteles.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    BuscadorComponent
  ]
})
export class HotelesComponent implements OnInit {
  hotelesRecientes: HotelData[] = [];
  hotelesPopulares: HotelData[] = [];
  mensajeError: string | null = null;

  private readonly UMBRAL_POPULARIDAD = 4.7;

  constructor(
    private hotelService: HotelService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarHotelesDesdeApi();
    }
  }

  cargarHotelesDesdeApi() {
    this.hotelService.getHoteles().subscribe({
      next: (hoteles: HotelData[]) => {
        this.hotelesRecientes = hoteles.slice(0, 4);
        this.hotelesPopulares = hoteles.filter(
          hotel => (hotel.estrellas ?? 0) >= this.UMBRAL_POPULARIDAD
        );
      },
      error: (error) => {
        console.error('Error al cargar hoteles desde la API:', error);
        this.mensajeError = 'Ocurrió un error al cargar los hoteles. Intenta nuevamente.';
      }
    });
  }
}
