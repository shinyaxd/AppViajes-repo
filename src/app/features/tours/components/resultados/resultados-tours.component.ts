import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../../../../shared/components/buscador/buscador.component';
import { ResultadosListaComponent, ResultadoItem } from '../../../../shared/components/resultados-lista/resultados-lista.component';
import { tap, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TourService, TourData } from '../../services/tour.service';

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
        // Si hay categoría, filtrar por categoría
        if (params['categoria']) {
          return this.tourService.getToursByCategoria(params['categoria']);
        }
        // Si no, traer todos los tours
        return this.tourService.getTours();
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
   */
  private transformarToursAResultados(tours: any[]): ResultadoItem[] {
    return tours.map(tour => ({
      id: tour.id,
      nombre: tour.nombre,
      imagen_url: tour.imagen_url || 'assets/images/placeholder-tour.jpg',
      ubicacion: `${tour.ciudad}, ${tour.pais}`,
      rating: 4.5, // Simulado
      ratingTexto: tour.tour?.categoria === 'Aventura' ? 'Excelente' : 'Muy bueno',
      resenias: Math.floor(Math.random() * 50) + 10, // Simulado
      precio: parseFloat(tour.tour?.precio || '0'),
      precioUnidad: 'persona',
      duracionHoras: tour.tour?.duracion ? Math.round(tour.tour.duracion / 60) : 0 // Convertir minutos a horas
    }));
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
