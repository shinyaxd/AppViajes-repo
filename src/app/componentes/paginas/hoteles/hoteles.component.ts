import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BuscadorComponent } from '../../buscador/buscador.component';
// 🛑 Importamos solo lo necesario del servicio. Las interfaces locales se eliminaron.
import { HotelService, HotelData } from './services/hoteles.service'; 

// Las interfaces locales HotelApiRespuesta y Hotel han sido eliminadas
// ya que ya están definidas o transformadas en HotelService.

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
  private readonly UMBRAL_POPULARIDAD = 4.7;

  // 💡 El 'router' se inyecta pero no se usa en este código. Lo mantengo por si lo usas en el futuro.
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
    // El servicio ahora garantiza que cada objeto HotelData[] tiene 'imagen_principal'
    this.hotelService.getHoteles().subscribe({
      next: (hoteles: HotelData[]) => {
        // La propiedad 'estrellas' debería ser de tipo number en HotelData
        const hotelesValidos = hoteles.filter(h => typeof h.id === 'number');
        this.hotelesRecientes = hotelesValidos.slice(0, 4);
        this.hotelesPopulares = hotelesValidos.filter(hotel => (hotel.estrellas ?? 0) >= this.UMBRAL_POPULARIDAD);
      },
      error: (error) => {
        console.error('Error al cargar hoteles desde la API:', error);
      }
    });
  }
}