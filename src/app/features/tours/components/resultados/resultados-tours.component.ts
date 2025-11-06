import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../../../../shared/components/buscador/buscador.component';
import { ResultadosListaComponent, ResultadoItem } from '../../../../shared/components/resultados-lista/resultados-lista.component';
import { tap, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TourService, TourData } from '../../services/tour.service';
import { ServicioTransformers } from '../../../../shared/utils/transformers';

interface BusquedaTourParams {
  destino: string;
  categoria: string;
  checkIn: string;
  checkOut: string;
  personas: number;
}

@Component({
  selector: 'app-resultados-tours',
  templateUrl: './resultados-tours.component.html',
  styleUrls: ['./resultados-tours.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BuscadorComponent,
    ResultadosListaComponent
  ]
})
export class ResultadosTOURSComponent implements OnInit {

  private tourService = inject(TourService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  toursFiltrados: any[] = [];
  resultadosItems: ResultadoItem[] = [];
  totalTours: number = 0;
  tours$!: Observable<any[]>;

  // Filtros
  destino: string = '';
  categoria: string = '';
  checkInDate: string = '';
  checkOutDate: string = '';
  personas: number = 1;

  ngOnInit(): void {
    this.cargarToursConFiltrosDeRuta();
  }

  cargarToursConFiltrosDeRuta(): void {
    this.tours$ = this.route.queryParams.pipe(
      tap(params => {
        this.destino = params['destino'] || '';
        this.categoria = params['categoria'] || '';
        this.checkInDate = params['checkIn'] || '';
        this.checkOutDate = params['checkOut'] || '';
        this.personas = +params['personas'] || 1;
      }),
      switchMap(params => {
        // 1) Si solo hay categoría y no hay checkIn → búsqueda rápida por imagen
        if (this.categoria && !this.checkInDate) {
          return this.tourService.getToursByCategoria(this.categoria);
        }
        // 2) Si hay checkIn (obligatorio para la búsqueda avanzada) → usar getToursFiltrados
        return this.tourService.getToursFiltrados({
          destino: this.destino,
          categoria: this.categoria,
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          cupos:  this.personas
        });
      }),
      tap(tours => {
        // Filtrar tours que tengan datos válidos
        this.toursFiltrados = tours.filter((t: any) => t.tour !== null);
        this.totalTours = this.toursFiltrados.length;
        this.resultadosItems = this.transformarToursAResultados(this.toursFiltrados);
        console.log(`Tours encontrados: ${this.toursFiltrados.length}`);
      })
    );

    this.tours$.subscribe();
  }

  /**
   * Transforma datos de tours a ResultadoItem[] para el componente genérico
   * ACTUALIZADO: Usa ServicioTransformers centralizado
   */
  private transformarToursAResultados(tours: any[]): ResultadoItem[] {
    return ServicioTransformers.toursToResultados(tours);
  }

  actualizarBusqueda(params: BusquedaTourParams): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        destino: params.destino,
        categoria: params.categoria,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        personas: params.personas
      }
    });
  }
}
