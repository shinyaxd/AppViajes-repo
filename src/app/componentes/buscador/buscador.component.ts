import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
// 💡 Importamos 'take' para asegurar una sola emisión
import { take } from 'rxjs/operators'; 

// 💡 IMPORTAMOS EL SERVICIO
import { HotelService } from '../../componentes/paginas/hoteles/services/hoteles.service'; 

// Define la estructura de los filtros para Hoteles
interface FiltroHotel {
  adultos: number;
  ninos: number;
  habitaciones: number;
}

// Define la estructura de los filtros para Tours
interface FiltroTour {
  total: number;
}

@Component({
  selector: 'app-buscador-dinamico',
  templateUrl: './buscador.component.html',
  styleUrls: ['./buscador.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ]
})
export class BuscadorComponent implements OnInit {

  @Input() tipoBusqueda: 'hoteles' | 'tours' | undefined;

  destino: string = '';
  sugerencias: string[] = [];
  lugaresDisponibles: string[] = [];
  
  // 💡 NUEVA PROPIEDAD: Bandera para asegurar que la carga solo ocurra una vez
  private destinosCargados = false; 

  checkInDate: string = '';
  checkOutDate: string = '';
  minDate: string;
  minCheckoutDate: string;

  // Propiedades para huéspedes y cuartos de HOTELES
  huespedes: FiltroHotel = {
    adultos: 1, 
    ninos: 0,   
    habitaciones: 1
  };
  showGuestMenu = false;

  // Propiedades para TOURS
  categoriaTour: string = '';
  personas: FiltroTour = {
    total: 1
  };
  showGuestMenuTour = false;

  constructor(
    private router: Router, 
    private hotelService: HotelService // 👈 ¡Inyectamos el servicio!
  ) {
    this.minDate = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minCheckoutDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    // 💡 CORRECCIÓN 1: Llamar a la carga solo si aún no se ha hecho
    if (!this.destinosCargados) {
      this.cargarDestinosDisponibles();
    }
  }

  /**
   * Carga la lista de destinos llamando al método del HotelService.
   * Se añade 'take(1)' para evitar múltiples llamadas en modo estricto de Angular.
   */
  cargarDestinosDisponibles() {
    this.hotelService.getDestinos().pipe(
      // Usamos take(1) para asegurar que la suscripción solo se procese una vez.
      take(1)
    ).subscribe({
      next: (ubicacionesUnicas: string[]) => {
        this.lugaresDisponibles = ubicacionesUnicas;
        this.destinosCargados = true; // 💡 CORRECCIÓN 2: Establecer bandera al completar la carga
        console.log('Destinos disponibles cargados (ubicaciones únicas):', this.lugaresDisponibles);
      },
      error: (error: any) => {
        console.error('Error al cargar la lista de ubicaciones desde la API (a través del servicio)', error);
        this.lugaresDisponibles = [];
      }
    });
  }

  // Métodos del buscador (el resto de la lógica permanece igual)
  buscarSugerencias() {
    if (this.destino.length > 2) {
      this.sugerencias = this.lugaresDisponibles.filter(lugar =>
        lugar.toLowerCase().includes(this.destino.toLowerCase())
      );
    } else {
      this.sugerencias = [];
    }
  }

  buscarSugerenciasTours() {
    this.buscarSugerencias();
  }

  seleccionarDestino(sugerencia: string) {
    this.destino = sugerencia;
    this.sugerencias = [];
  }

  onCheckInChange(event: Event) {
    const checkInDate = (event.target as HTMLInputElement).value;
    const nextDay = new Date(checkInDate);
    nextDay.setDate(nextDay.getDate() + 1);
    this.minCheckoutDate = nextDay.toISOString().split('T')[0];
  }

  toggleGuestMenu() {
    this.showGuestMenu = !this.showGuestMenu;
  }

  toggleGuestMenuTour() {
    this.showGuestMenuTour = !this.showGuestMenuTour;
  }

  changeCount(tipo: 'adultos' | 'ninos' | 'habitaciones', cambio: number) {
    if (tipo === 'adultos') {
      this.huespedes.adultos = Math.max(1, this.huespedes.adultos + cambio);
    } else if (tipo === 'ninos') {
      this.huespedes.ninos = Math.max(0, this.huespedes.ninos + cambio);
    } else if (tipo === 'habitaciones') {
      this.huespedes.habitaciones = Math.max(1, this.huespedes.habitaciones + cambio);
    }
  }

  changeCountTour(tipo: 'total', cambio: number) {
    if (tipo === 'total') {
      this.personas.total = Math.max(1, this.personas.total + cambio);
    }
  }

  mostrarLugares() {
    console.log('Navegando a la página de resultados...');
    if (this.tipoBusqueda === 'hoteles') {
      this.router.navigate(['/resultadosHoteles'], {
        queryParams: {
          query: this.destino,
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          adultos: this.huespedes.adultos,
          ninos: this.huespedes.ninos,
          habitaciones: this.huespedes.habitaciones
        }
      });
    } else if (this.tipoBusqueda === 'tours') {
      this.router.navigate(['/resultadosTours'], {
        queryParams: {
          destino: this.destino,
          categoria: this.categoriaTour,
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          personas: this.personas.total
        }
      });
    }
  }
}
