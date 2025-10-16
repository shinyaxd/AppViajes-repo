import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../../../../shared/components/buscador/buscador.component';
import { ResultadosListaComponent, ResultadoItem } from '../../../../shared/components/resultados-lista/resultados-lista.component';
import { tap, switchMap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HotelService, HotelData } from '../../services/hoteles.service';

interface BusquedaHotelParams {
  ciudad: string;
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  habitaciones: number; 
}

@Component({
  selector: 'app-resultados-hoteles',
  templateUrl: './resultados-hoteles.component.html',
  styleUrls: ['./resultados-hoteles.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BuscadorComponent,
    ResultadosListaComponent
  ]
})
export class ResultadosHOTELESComponent implements OnInit {

  private hotelService = inject(HotelService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 

  hotelesFiltrados: HotelData[] = [];
  resultadosItems: ResultadoItem[] = [];
  totalHoteles: number = 0;
  hoteles$!: Observable<HotelData[]>;

  ciudad: string = '';
  checkInDate: string = '';
  checkOutDate: string = '';
  adultos: number = 1;
  ninos: number = 0;
  habitaciones: number = 1;

  ngOnInit(): void {
    this.cargarHotelesConFiltrosDeRuta();
  }

  cargarHotelesConFiltrosDeRuta(): void {
    this.hoteles$ = this.route.queryParams.pipe(
      tap(params => {
        this.ciudad = params['ciudad'] || '';
        this.checkInDate = params['checkIn'] || '';
        this.checkOutDate = params['checkOut'] || '';
        this.adultos = +params['adultos'] || 1;
        this.ninos = +params['ninos'] || 0;
        this.habitaciones = +params['habitaciones'] || 1;
      }),
      switchMap(params => {
        // Si no hay filtros, traer todos los hoteles
        const apiParams = params['ciudad'] ? {
          ciudad: params['ciudad'],
          check_in: params['checkIn'],
          check_out: params['checkOut'],
          adultos: params['adultos'],
          ninos: params['ninos'],
          habitaciones: params['habitaciones']
        } : undefined;
        
        return this.hotelService.getHoteles(apiParams);
      }),
      tap(hoteles => {
        this.hotelesFiltrados = hoteles;
        this.totalHoteles = hoteles.length;
        this.resultadosItems = this.transformarHotelesAResultados(hoteles);
        console.log(`Hoteles encontrados: ${hoteles.length}`);
      })
    );

    this.hoteles$.subscribe();
  }

  /**
   * Transforma HotelData[] a ResultadoItem[] para el componente genérico
   */
  private transformarHotelesAResultados(hoteles: HotelData[]): ResultadoItem[] {
    return hoteles.map(hotel => ({
      id: hotel.id,
      nombre: hotel.nombre,
      imagen_url: hotel.imagen_url || (hotel.galeria_imagenes && hotel.galeria_imagenes.length > 0 
        ? hotel.galeria_imagenes[0] 
        : 'assets/images/placeholder-hotel.jpg'),
      ubicacion: `${hotel.ciudad}, ${hotel.pais}`,
      rating: 4.4, // Simulado (tu API no tiene este campo aún)
      ratingTexto: 'Muy bueno',
      resenias: Math.floor(Math.random() * 100) + 10, // Simulado
      precio: hotel.precio_por_noche || 0,
      precioUnidad: 'noche',
      estrellas: hotel.estrellas
    }));
  }

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

  // ✅ NUEVO: volver conservando filtros
  volverAResultados(): void {
    this.router.navigate(['/resultadosHoteles'], {
      queryParams: {
        ciudad: this.ciudad,
        checkIn: this.checkInDate,
        checkOut: this.checkOutDate,
        adultos: this.adultos,
        ninos: this.ninos,
        habitaciones: this.habitaciones
      }
    });
  }
}
