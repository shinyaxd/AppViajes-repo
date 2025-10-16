import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { HotelService, Habitacion, HotelData, HotelDetalles } from '../../../features/hoteles/services/hoteles.service'; 

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

// -----------------------------------------------------------------

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

  // 🔑 Inyección de servicios usando inject()
  private router = inject(Router);
  private hotelService = inject(HotelService); 

  // La propiedad de entrada para determinar qué tipo de buscador mostrar
  @Input() tipoBusqueda: 'hoteles' | 'tours' | undefined;

  // Propiedades del buscador
  destino: string = ''; // Ahora representa la ciudad
  sugerencias: string[] = [];
  lugaresDisponibles: string[] = []; 

  // Propiedades para fechas
  checkInDate: string = '';
  checkOutDate: string = '';
  minDate: string;
  minCheckoutDate: string;

  // Propiedades para huéspedes y cuartos de HOTELES
  huespedes: FiltroHotel = {
    adultos: 1, // Mínimo 1 adulto
    ninos: 0,   // Mínimo 0 niños
    habitaciones: 1
  };
  showGuestMenu = false;

  // Propiedades para TOURS
  categoriaTour: string = '';
  personas: FiltroTour = {
    total: 1
  };
  showGuestMenuTour = false;

  constructor() {
    this.minDate = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minCheckoutDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.cargarDestinosDisponibles();
  }

  /**
   * Carga la lista de ciudades disponibles desde la API de Hoteles.
   * Utiliza hotelService.getHoteles() y extrae la propiedad 'ciudad'.
   */
  cargarDestinosDisponibles() {
    this.hotelService.getHoteles().subscribe({
      next: (hoteles: HotelData[]) => { // <-- ¡CORREGIDO!
        // 1. Mapeamos para obtener solo el campo 'ciudad' de cada hotel
        const ciudades = hoteles
          .map(hotel => hotel.ciudad)
          // 2. Usamos Set para obtener solo valores únicos (sin duplicados)
          .filter(ciudad => !!ciudad);

        this.lugaresDisponibles = Array.from(new Set(ciudades));

        console.log('Ciudades disponibles cargadas desde la API:', this.lugaresDisponibles);
      },
      error: (error: any) => {
        console.error('Error al cargar la lista de ciudades desde la API:', error);
        // Fallback en caso de que la API falle
        this.lugaresDisponibles = ['Lima', 'Cusco', 'Arequipa']; 
      }
    });
  }

  buscarSugerencias() {
    if (this.destino.length > 2) {
      this.sugerencias = this.lugaresDisponibles.filter(lugar =>
        // Filtramos por ciudad (antes ubicación)
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

  // Método de Hoteles
  toggleGuestMenu() {
    this.showGuestMenu = !this.showGuestMenu;
  }

  // Método de Tours
  toggleGuestMenuTour() {
    this.showGuestMenuTour = !this.showGuestMenuTour;
  }

  // Método de Hoteles (Alineado con 'habitaciones')
  changeCount(tipo: 'adultos' | 'ninos' | 'habitaciones', cambio: number) {
    if (tipo === 'adultos') {
      this.huespedes.adultos = Math.max(1, this.huespedes.adultos + cambio);
    } else if (tipo === 'ninos') {
      this.huespedes.ninos = Math.max(0, this.huespedes.ninos + cambio);
    } else if (tipo === 'habitaciones') {
      this.huespedes.habitaciones = Math.max(1, this.huespedes.habitaciones + cambio);
    }
  }

  // Método de Tours
  changeCountTour(tipo: 'total', cambio: number) {
    if (tipo === 'total') {
      this.personas.total = Math.max(1, this.personas.total + cambio);
    }
  }

  /**
   * Método para la navegación a resultados de hoteles/tours.
   * Pasa los filtros como Query Parameters.
   */
  mostrarLugares() {
    console.log('Navegando a la página de resultados...', {
      tipo: this.tipoBusqueda,
      destino: this.destino,
      checkIn: this.checkInDate,
      checkOut: this.checkOutDate
    });
    
    if (this.tipoBusqueda === 'hoteles') {
      this.router.navigate(['/hoteles/resultados'], {
        queryParams: {
          ciudad: this.destino, 
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          adultos: this.huespedes.adultos,
          ninos: this.huespedes.ninos,
          habitaciones: this.huespedes.habitaciones
        }
      });
    } else if (this.tipoBusqueda === 'tours') {
      this.router.navigate(['/tour/resultados'], {
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
