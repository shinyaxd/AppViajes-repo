// src/app/hoteles/hoteles.component.ts

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
// ❌ ELIMINAMOS: HttpClientModule, HttpClient (Ya están en el servicio)
// ❌ ELIMINAMOS: map (Ya se usa dentro del servicio)
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// 💡 IMPORTAMOS EL SERVICIO y la INTERFAZ HOTEL
import { HotelService, Hotel } from './services/hoteles.service';
import { BuscadorComponent } from '../../buscador/buscador.component';

// ------------------------------------

@Component({
  selector: 'app-hoteles',
  standalone: true,
  templateUrl: './hoteles.component.html',
  styleUrls: ['./hoteles.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    // ❌ ELIMINAMOS: HttpClientModule
    RouterModule,
    BuscadorComponent
  ]
})

export class HotelesComponent implements OnInit {

  // 💡 Usamos la interfaz Hotel importada del servicio
  hotelesRecientes: Hotel[] = [];
  hotelesPopulares: Hotel[] = []; 
  errorMessage: string = ''; // 💡 Útil para mostrar errores al usuario

  private readonly UMBRAL_POPULARIDAD = 4.7;

  constructor(
    private hotelService: HotelService, // 👈 ¡Inyectamos el nuevo servicio!
    @Inject(PLATFORM_ID) private platformId: Object, 
    private router: Router
  ) {
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarHoteles(); // 👈 Llamamos al método que usa el servicio
    }
  }

  /**
   * Carga los hoteles llamando al servicio.
   * La URL y la petición HTTP están encapsuladas en HotelService.
   */
  cargarHoteles() {
    // 💡 Llamada limpia: el servicio retorna el array de hoteles directamente
    this.hotelService.getHoteles().subscribe({
      next: (hoteles) => { // 'hoteles' es el array limpio (Hotel[])
        
        // Aseguramos que solo incluimos hoteles que tienen una propiedad ID válida
        const hotelesValidos = hoteles.filter(h => typeof h.id === 'number');

        // 1. Hoteles Recientes: Tomamos los primeros 4 
        this.hotelesRecientes = hotelesValidos.slice(0, 4); 
        
        // 2. Hoteles Populares: Filtramos por rating >= 4.7
        this.hotelesPopulares = hotelesValidos.filter(hotel => (hotel.estrellas ?? 0) >= this.UMBRAL_POPULARIDAD);
        
        this.errorMessage = ''; // Limpiamos errores si la carga fue exitosa
      },
      error: (err) => {
          // 💡 Manejo de errores de la API
          this.errorMessage = 'No se pudieron cargar los hoteles. Verifique su conexión al backend.';
          console.error('Error al cargar hoteles desde la API del backend:', err);
      }
    }); 
  }
}