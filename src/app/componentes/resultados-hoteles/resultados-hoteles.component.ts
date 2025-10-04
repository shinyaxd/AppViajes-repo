import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../buscador/buscador.component';
import { tap, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

// 🔑 Importamos el servicio y la interfaz Hotel
import { HotelService, HotelData } from '../paginas/hoteles/services/hoteles.service';

// --- INTERFACES ---

interface BusquedaHotelParams {
  ciudad: string;
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  habitaciones: number; 
}

// ------------------------------------

@Component({
  selector: 'app-resultados-hoteles',
  templateUrl: './resultados-hoteles.component.html',
  styleUrls: ['./resultados-hoteles.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BuscadorComponent
  ]
})

export class ResultadosHOTELESComponent implements OnInit {
  
  // 🔑 Inyección de dependencias
  private hotelService = inject(HotelService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 

  // Hoteles a mostrar (ahora se cargan directamente filtrados)
  hotelesFiltrados: HotelData[] = [];
  hoteles$!: Observable<HotelData[]>; // Opción con Observable para carga asíncrona

  // Propiedades para guardar los filtros de la URL
  ciudad: string = '';
  checkInDate: string = '';
  checkOutDate: string = '';
  adultos: number = 1;
  ninos: number = 0;
  habitaciones: number = 1;

  ngOnInit(): void {
    this.cargarHotelesConFiltrosDeRuta();
  }

  /**
   * Carga los hoteles utilizando los filtros de los Query Params de la URL.
   * Utiliza switchMap para cancelar peticiones viejas si los parámetros cambian.
   */
  cargarHotelesConFiltrosDeRuta(): void {
    this.hoteles$ = this.route.queryParams.pipe(
      // 1. Guarda los parámetros de búsqueda localmente
      tap(params => {
        this.ciudad = params['ciudad'] || '';
        this.checkInDate = params['checkIn'] || '';
        this.checkOutDate = params['checkOut'] || '';
        this.adultos = +params['adultos'] || 1;
        this.ninos = +params['ninos'] || 0;
        this.habitaciones = +params['habitaciones'] || 1;
      }),
      // 2. Mapea los Query Params a la estructura esperada por la API
      switchMap(params => {
        // Renombra los Query Params de Angular al formato de Laravel (check_in, check_out)
        const apiParams = {
          ciudad: params['ciudad'],
          check_in: params['checkIn'], // <-- ¡CRUCIAL!
          check_out: params['checkOut'], // <-- ¡CRUCIAL!
          adultos: params['adultos'],
          ninos: params['ninos'],
          habitaciones: params['habitaciones']
        };
        // 3. Llama al servicio con los parámetros
        return this.hotelService.getHoteles(apiParams);
      }),
      // 4. Guarda los resultados en la propiedad local (si no usas async pipe)
      tap(hoteles => {
        this.hotelesFiltrados = hoteles;
        console.log(`Hoteles encontrados: ${hoteles.length}`);
      })
    );
    
    // Opcional: Suscribirse directamente si no se usa async pipe en el HTML
    this.hoteles$.subscribe();
  }

  /**
   * Método que se puede llamar desde un componente Buscador anidado 
   * para actualizar la ruta y recargar los resultados.
   * @param params Los nuevos filtros de búsqueda.
   */
  actualizarBusqueda(params: BusquedaHotelParams): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        ciudad: params.ciudad,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adultos: params.adultos,
        ninos: params.ninos,
        habitaciones: params.habitaciones
      }
    });
  }
}