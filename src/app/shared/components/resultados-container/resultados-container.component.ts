import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, switchMap, map } from 'rxjs/operators';

import { BuscadorComponent } from '../buscador/buscador.component';
import { ResultadosListaComponent, ResultadoItem } from '../resultados-lista/resultados-lista.component';
import { HotelService, HotelData } from '../../../features/hoteles/services/hoteles.service';
import { TourService, TourData } from '../../../features/tours/services/tour.service';
import { ServicioTransformers } from '../../utils/transformers';

/**
 * Parámetros de búsqueda para hoteles
 */
interface BusquedaHotelParams {
  ciudad: string;
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  habitaciones: number;
}

/**
 * Parámetros de búsqueda para tours
 */
interface BusquedaTourParams {
  destino: string;
  categoria: string;
  checkIn: string;
  checkOut: string;
  personas: number;
}

/**
 * Componente contenedor genérico para resultados de búsqueda
 * Funciona tanto para hoteles como para tours
 * 
 * Uso:
 * <app-resultados-container [tipo]="'hoteles'"></app-resultados-container>
 * <app-resultados-container [tipo]="'tours'"></app-resultados-container>
 */
@Component({
  selector: 'app-resultados-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BuscadorComponent,
    ResultadosListaComponent
  ],
  template: `
    <div class="resultados-page">
      <!-- Buscador -->
      <div class="search-bar-container">
        <app-buscador-dinamico [tipoBusqueda]="tipo"></app-buscador-dinamico>
      </div>

      <!-- Resultados -->
      <div class="resultados-wrapper">
        <app-resultados-lista
          [tipo]="tipo"
          [items]="resultadosItems"
          [totalItems]="totalItems"
          [mostrarMas]="false">
        </app-resultados-lista>

        <!-- Mensaje de carga -->
        <div *ngIf="(servicios$ | async) === null" class="loading-message">
          <p>Cargando {{ tipo }}...</p>
        </div>

        <!-- Mensaje sin resultados -->
        <div *ngIf="totalItems === 0 && (servicios$ | async) !== null" class="no-results-message">
          <p>No se encontraron {{ tipo }} con los criterios especificados.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resultados-page {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .search-bar-container {
      margin-bottom: 2rem;
    }

    .resultados-wrapper {
      width: 100%;
    }

    .loading-message,
    .no-results-message {
      text-align: center;
      padding: 3rem 1rem;
      color: #666;
    }

    .loading-message p {
      font-size: 1.2rem;
    }

    .no-results-message p {
      font-size: 1.1rem;
      color: #999;
    }
  `]
})
export class ResultadosContainerComponent implements OnInit {
  @Input() tipo: 'hoteles' | 'tours' = 'hoteles';

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private hotelService = inject(HotelService);
  private tourService = inject(TourService);

  servicios$!: Observable<HotelData[] | TourData[]>;
  resultadosItems: ResultadoItem[] = [];
  totalItems: number = 0;

  // Parámetros de búsqueda actuales
  parametrosBusqueda: any = {};

  ngOnInit(): void {
    this.cargarServiciosConFiltros();
  }

  /**
   * Carga los servicios (hoteles o tours) aplicando filtros de la URL
   */
  private cargarServiciosConFiltros(): void {
    this.servicios$ = this.route.queryParams.pipe(
      tap(params => {
        // Guardar parámetros según el tipo
        if (this.tipo === 'hoteles') {
          this.parametrosBusqueda = {
            ciudad: params['ciudad'] || '',
            checkIn: params['checkIn'] || '',
            checkOut: params['checkOut'] || '',
            adultos: +params['adultos'] || 1,
            ninos: +params['ninos'] || 0,
            habitaciones: +params['habitaciones'] || 1
          };
        } else {
          this.parametrosBusqueda = {
            destino: params['destino'] || '',
            categoria: params['categoria'] || '',
            checkIn: params['checkIn'] || '',
            checkOut: params['checkOut'] || '',
            personas: +params['personas'] || 1
          };
        }
      }),
      switchMap(params => {
        if (this.tipo === 'hoteles') {
          return this.cargarHoteles(params);
        } else {
          return this.cargarTours(params);
        }
      }),
      tap(servicios => {
        this.totalItems = servicios.length;
        this.resultadosItems = this.transformarServicios(servicios);
        console.log(`${this.tipo} encontrados: ${servicios.length}`);
      })
    );

    // Suscribirse para iniciar la carga
    this.servicios$.subscribe();
  }

  /**
   * Carga hoteles con parámetros de filtro
   */
  private cargarHoteles(params: any): Observable<HotelData[]> {
    const apiParams = params['ciudad'] ? {
      ciudad: params['ciudad'],
      check_in: params['checkIn'],
      check_out: params['checkOut'],
      adultos: params['adultos'],
      ninos: params['ninos'],
      habitaciones: params['habitaciones']
    } : undefined;

    return this.hotelService.getHoteles(apiParams);
  }

  /**
   * Carga tours con parámetros de filtro
   */
  private cargarTours(params: any): Observable<TourData[]> {
    if (params['categoria']) {
      return this.tourService.getToursByCategoria(params['categoria']);
    }
    return this.tourService.getTours();
  }

  /**
   * Transforma servicios a ResultadoItem usando los transformadores centralizados
   */
  private transformarServicios(servicios: HotelData[] | TourData[]): ResultadoItem[] {
    if (this.tipo === 'hoteles') {
      return ServicioTransformers.hotelesToResultados(servicios as HotelData[]);
    } else {
      // Filtrar tours que tengan datos válidos
      const toursValidos = (servicios as any[]).filter(t => t.tour !== null);
      return ServicioTransformers.toursToResultados(toursValidos);
    }
  }
}
