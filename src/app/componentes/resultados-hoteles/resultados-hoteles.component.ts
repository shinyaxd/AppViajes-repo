import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../buscador/buscador.component';
import { tap, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HotelService, HotelData } from '../paginas/hoteles/services/hoteles.service';

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
    BuscadorComponent
  ]
})
export class ResultadosHOTELESComponent implements OnInit {

  private hotelService = inject(HotelService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 

  hotelesFiltrados: HotelData[] = [];
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
        const apiParams = {
          ciudad: params['ciudad'],
          check_in: params['checkIn'],
          check_out: params['checkOut'],
          adultos: params['adultos'],
          ninos: params['ninos'],
          habitaciones: params['habitaciones']
        };
        return this.hotelService.getHoteles(apiParams);
      }),
      tap(hoteles => {
        this.hotelesFiltrados = hoteles;
        console.log(`Hoteles encontrados: ${hoteles.length}`);
      })
    );

    this.hoteles$.subscribe();
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
