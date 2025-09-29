import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
// Eliminado: HttpClient, map, tap (Tap se usa correctamente, pero las interfaces de hotel.service eran el problema)
import { BuscadorComponent } from '../buscador/buscador.component';
import { tap } from 'rxjs/operators';

// 💡 CORRECCIÓN CRÍTICA: Se agregó la coma (,) entre HotelService y HotelListado.
import { HotelService, HotelListado, CapacidadHotel, DisponibilidadHotel } from '../paginas/hoteles/services/hoteles.service';


// --- INTERFACES DE BÚSQUEDA (se quedan en el componente si solo este las usa) ---

interface BusquedaHotelParams {
  query: string;
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

  filtroSeleccionado: 'hoteles' | 'moteles' | 'resorts' = 'hoteles';
  todosLosHoteles: HotelListado[] = [];
  hotelesFiltrados: HotelListado[] = [];
  
  checkInDate: string = '';
  checkOutDate: string = '';
  
  adultos: number = 0;
  ninos: number = 0;
  habitaciones: number = 0; 

  conteos: { [key: string]: number } = {
    hoteles: 0,
    moteles: 0,
    resorts: 0
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private hotelService: HotelService // 👈 ¡Inyectamos el servicio!
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.checkInDate = params['checkIn'] || '';
      this.checkOutDate = params['checkOut'] || '';
      this.adultos = +params['adultos'] || 1;
      this.ninos = +params['ninos'] || 0;
      this.habitaciones = +params['habitaciones'] || 1;
      
      this.cargarTodosLosHoteles().pipe(
        tap(() => {
          const query = params['ubicacion'] || params['query'] || '';
          const busqueda: BusquedaHotelParams = {
            query: query,
            checkIn: this.checkInDate,
            checkOut: this.checkOutDate,
            adultos: this.adultos, 
            ninos: this.ninos,     
            habitaciones: this.habitaciones
          };
          this.filtrarHoteles(busqueda);
        })
      ).subscribe();
    });
  }

  // --- FUNCIÓN CLAVE SIMPLIFICADA ---
  cargarTodosLosHoteles() {
    // 💡 ¡Llamada limpia al servicio! Él se encarga de la petición HTTP y el mapeo.
    return this.hotelService.getHotelesListado().pipe(
      tap((data: HotelListado[]) => {
        this.todosLosHoteles = data;
        this.contarPorTipo();
      })
    );
  }
  // --------------------------------------------------

  private contarPorTipo() {
    this.conteos['hoteles'] = this.todosLosHoteles.filter(lugar => lugar.tipo === 'hotel').length;
    this.conteos['moteles'] = this.todosLosHoteles.filter(lugar => lugar.tipo === 'motel').length;
    this.conteos['resorts'] = this.todosLosHoteles.filter(lugar => lugar.tipo === 'resort').length;
  }

  filtrarHoteles(busqueda: BusquedaHotelParams) {
    const busquedaMinusculas = busqueda.query.toLowerCase().trim();
    
    this.hotelesFiltrados = this.todosLosHoteles.filter(hotel => {
      
      // 💡 CORRECCIÓN: Usar .includes() en ubicación y distrito para búsquedas más flexibles
      const ubicacionCoincide = hotel.ubicacion?.toLowerCase().includes(busquedaMinusculas);
      const distritoCoincide = hotel.distrito?.toLowerCase().includes(busquedaMinusculas);
      const nombreCoincide = hotel.nombre?.toLowerCase().includes(busquedaMinusculas);
      
      const lugarCoincide = ubicacionCoincide || distritoCoincide || nombreCoincide;
      
      // --- DEBUGGING: Se recomienda mover la lógica de debug al final para evitar interrupciones innecesarias ---
      
      if (!lugarCoincide) {
          // El hotel NO coincide con la ubicación/nombre
          return false;
      }
      
      const disponibilidadCoincide = this.verificarDisponibilidad(
        hotel, 
        busqueda.checkIn, 
        busqueda.checkOut, 
        busqueda.adultos,
        busqueda.ninos,
        busqueda.habitaciones
      );
      
      // La lógica de verificación de disponibilidad se mantiene.
      if (!disponibilidadCoincide) {
          // Si el lugar coincide, pero la disponibilidad falla, retorna falso.
          return false;
      }

      // Si ambos filtros (lugar y disponibilidad) pasan.
      return true;
    });
  }

  // --- FUNCIÓN DE DISPONIBILIDAD INTACTA ---
  private verificarDisponibilidad(
    hotel: HotelListado, 
    checkInStr: string, 
    checkOutStr: string,
    adultos: number,
    ninos: number,
    habitaciones: number
  ): boolean {
    
    // Lógica de Capacidad (Usando 'filtros' y propiedades del servicio)
    if (!hotel.filtros) {
        console.error(`[DEBUG CAPACIDAD] Hotel ${hotel.nombre}: NO tiene propiedad 'filtros'.`);
        return false;
    }

    const capacidadAdultos = hotel.filtros.adultos ?? 0; 
    const capacidadNinos = hotel.filtros.ninos ?? 0;     
    const capacidadHabitaciones = hotel.filtros.habitaciones ?? 0; 

    if (adultos > capacidadAdultos) {
        console.error(`[DEBUG CAPACIDAD] Hotel ${hotel.nombre}: Falla Adultos. Buscados: ${adultos}, Capacidad: ${capacidadAdultos}`);
        return false;
    }
    if (ninos > capacidadNinos) {
        console.error(`[DEBUG CAPACIDAD] Hotel ${hotel.nombre}: Falla Niños. Buscados: ${ninos}, Capacidad: ${capacidadNinos}`);
        return false;
    }
    if (habitaciones > capacidadHabitaciones) {
        console.error(`[DEBUG CAPACIDAD] Hotel ${hotel.nombre}: Falla Habitaciones. Buscadas: ${habitaciones}, Capacidad: ${capacidadHabitaciones}`);
        return false;
    }

    // Lógica de Disponibilidad de Fechas
    const checkInDate = new Date(checkInStr);
    const checkOutDate = new Date(checkOutStr); 
    
    const fechaDesdeDisponibilidad = new Date(hotel.disponibilidad.desde);
    const fechaHastaDisponibilidad = new Date(hotel.disponibilidad.hasta);
    
    if (isNaN(fechaDesdeDisponibilidad.getTime()) || isNaN(fechaHastaDisponibilidad.getTime())) {
         console.error(`[DEBUG FECHAS] Hotel ${hotel.nombre}: Fechas de disponibilidad del JSON son inválidas.`);
         return false;
    }

    const inicioOk = checkInDate >= fechaDesdeDisponibilidad; 
    const finOk = checkOutDate <= fechaHastaDisponibilidad; 
    
    if (!inicioOk) {
        console.error(`[DEBUG FECHAS] Hotel ${hotel.nombre}: Falla Check-In. Búsqueda ${checkInStr} es antes de ${hotel.disponibilidad.desde}`);
    }
    if (!finOk) {
        console.error(`[DEBUG FECHAS] Hotel ${hotel.nombre}: Falla Check-Out. Búsqueda ${checkOutStr} es después de ${hotel.disponibilidad.hasta}`);
    }

    return inicioOk && finOk;
  }
  
  aplicarFiltro(filtro: 'hoteles' | 'moteles' | 'resorts') {
    this.filtroSeleccionado = filtro;
    console.log(`Filtro aplicado: ${this.filtroSeleccionado}`);
  }
}
