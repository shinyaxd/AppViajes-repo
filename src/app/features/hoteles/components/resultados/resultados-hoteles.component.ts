import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BuscadorComponent } from '../../../../shared/components/buscador/buscador.component';
import { ResultadosListaComponent, ResultadoItem } from '../../../../shared/components/resultados-lista/resultados-lista.component';
import { tap, switchMap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HotelService, HotelData } from '../../services/hoteles.service';
import { ServicioTransformers } from '../../../../shared/utils/transformers';

// 1. EL MOCK DATA
const MOCK_ACTIVIDADES_HOTEL = [
  {
    id: 1,
    titulo: 'Tour de Aventura Extrema en Lunahuaná',
    imagen: 'https://mochileaperu.com/wp-content/uploads/2020/03/canopy-tdp-696x415.png',
    rating: 4.8,
    ratingTexto: 'Excelente',
    resenias: 35,
    duracion: '10 Horas',
    precio: 85
  },
  {
    id: 2,
    titulo: 'Aventura en la Naturaleza en Lomas de Lachay',
    imagen: 'https://majestictyt.com/wp-content/uploads/2020/10/Lomas-de-Lachay-960x1149.jpg',
    rating: 4.5,
    ratingTexto: 'Muy bueno',
    resenias: 21,
    duracion: '9 Horas',
    precio: 40
  },
  {
    id: 3,
    titulo: 'Aventura en el Mar de la Costa Verde',
    imagen: 'https://freewalkingtoursperu.com/wp-content/uploads/2019/07/costa-verde-lima-peru-5.jpg',
    rating: 4.5,
    ratingTexto: 'Muy bueno',
    resenias: 21,
    duracion: '3 Horas',
    precio: 35
  },
  {
    id: 4,
    titulo: 'Trekking a la Laguna 69',
    imagen: 'https://images.squarespace-cdn.com/content/v1/5a87961cbe42d637c54cab93/1611152719695-GYI2P6S5ZL2Z1042UOAO/hiking-guide-laguna-69-peru.jpg',
    rating: 4.9,
    ratingTexto: 'Excepcional',
    resenias: 120,
    duracion: '12 Horas',
    precio: 60
  },
  {
    id: 5,
    titulo: 'Sandboarding en la Huacachina',
    imagen: 'https://cdn.getyourguide.com/image/format=auto,fit=contain,gravity=auto,quality=60,width=1440,height=650,dpr=1/tour_img/db43fe07a5896774c48ecda19a0c0920bb154c3782f9c4a4fe2c9086b0cbe402.jpg',
    rating: 4.7,
    ratingTexto: 'Excelente',
    resenias: 85,
    duracion: '4 Horas',
    precio: 30
  },
  {
    id: 6,
    titulo: 'City Tour Nocturno y Circuito Mágico',
    imagen: 'https://machupicchuwayna.com/wp-content/uploads/2025/06/Circuito-Magico-del-Agua.webp',
    rating: 4.6,
    ratingTexto: 'Muy bueno',
    resenias: 55,
    duracion: '5 Horas',
    precio: 45
  }
];

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

  itinerarioActivo$!: Observable<boolean>;

  // Variables Modal
  mostrarModalItinerario = false;
  itinerarioGenerado: any[] = [];
  hotelSeleccionado: any = null;

  ngOnInit(): void {
    this.cargarHotelesConFiltrosDeRuta();
    this.itinerarioActivo$ = this.route.queryParams.pipe(
      map(params => {
        if (params.hasOwnProperty('itinerarioBasico')) {
          return params['itinerarioBasico'] === 'true';
        }
        return sessionStorage.getItem('itinerarioBasico') === 'true';
      }),
      tap(estado => console.log('🟢 Estado Itinerario:', estado))
    );
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
      })
    );
    this.hoteles$.subscribe();
  }

  private transformarHotelesAResultados(hoteles: HotelData[]): ResultadoItem[] {
    return ServicioTransformers.hotelesToResultados(hoteles);
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

  // ✅ MÉTODO PARA ABRIR EL ITINERARIO
  abrirItinerario(hotel: any) {
    console.log('Generando itinerario para:', hotel.nombre);
    this.hotelSeleccionado = hotel;
    const key = 'itinerario_hotel_' + hotel.id;
    
    // 1. Calcular cuántos días se necesitan REALMENTE según checkIn/Out
    let diasEstadia = 3; // Valor por defecto si no hay fechas
    
    if (this.checkInDate && this.checkOutDate) {
      // Parseo seguro de fechas YYYY-MM-DD
      const [y1, m1, d1] = this.checkInDate.split('-').map(Number);
      const [y2, m2, d2] = this.checkOutDate.split('-').map(Number);
      const fechaInicio = new Date(y1, m1 - 1, d1);
      const fechaFin = new Date(y2, m2 - 1, d2);
      
      const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      diasEstadia = diffDays > 0 ? diffDays : 1;
    }
    console.log(`Calculado: ${diasEstadia} días de itinerario.`);

    // 2. Intentar leer de memoria primero
    const guardado = sessionStorage.getItem(key);
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado);
        // 🔥 VALIDACIÓN IMPORTANTE: Si el itinerario guardado tiene una duración
        // diferente a la estancia actual, lo ignoramos y regeneramos uno nuevo.
        if (Array.isArray(parsed) && parsed.length === diasEstadia) {
          console.log('Cargando itinerario existente (longitud correcta).');
          this.itinerarioGenerado = parsed;
          this.mostrarModalItinerario = true;
          return;
        } else {
          console.log('Itinerario guardado tiene duración distinta. Regenerando...');
        }
      } catch(e) { /* error silencioso */ }
    }

    // 3. Generar NUEVO itinerario
    this.itinerarioGenerado = [];
    const pool = [...MOCK_ACTIVIDADES_HOTEL];

    while (this.itinerarioGenerado.length < diasEstadia) {
      pool.sort(() => 0.5 - Math.random()); // Mezclar
      for (const actividad of pool) {
        if (this.itinerarioGenerado.length < diasEstadia) {
          // Clonar para evitar referencias
          this.itinerarioGenerado.push({ ...actividad });
        } else {
          break;
        }
      }
    }

    // 4. Guardar para que Pagos pueda leerlo después
    sessionStorage.setItem(key, JSON.stringify(this.itinerarioGenerado));
    
    this.mostrarModalItinerario = true;
  }

  cerrarItinerario() {
    this.mostrarModalItinerario = false;
  }
}