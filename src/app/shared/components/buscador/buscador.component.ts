import { Component, OnInit, Input, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { HotelService, HotelData } from '../../../features/hoteles/services/hoteles.service'; 
import { TourData, TourService } from '../../../features/tours/services/tour.service'; 
import { DateUtils } from '../../utils/date.utils'; 

interface FiltroHotel {
  adultos: number;
  ninos: number;
  habitaciones: number;
}

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

  private router = inject(Router);
  private hotelService = inject(HotelService); 
  private tourService = inject(TourService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  @Input() tipoBusqueda: 'hoteles' | 'tours' | undefined;

  destino: string = '';
  sugerencias: string[] = [];
  lugaresDisponibles: string[] = []; 

  checkInDate: string = '';
  checkOutDate: string = '';
  minDate: string;
  minCheckoutDate: string;

  itinerarioBasico: boolean = false;

  huespedes: FiltroHotel = {
    adultos: 1,
    ninos: 0,
    habitaciones: 1
  };
  showGuestMenu = false;

  categoriaTour: string = '';
  personas: FiltroTour = {
    total: 1
  };
  showGuestMenuTour = false;

  constructor() {
    this.minDate = DateUtils.getTodayISO();
    this.minCheckoutDate = DateUtils.getTomorrowISO();

    if (isPlatformBrowser(this.platformId)) {
      const preferenciaSesion = sessionStorage.getItem('itinerarioBasico');
      this.itinerarioBasico = preferenciaSesion === 'true';
    }
  }

  // Propiedad computada: Si falta alguna fecha, devuelve true (bloqueado)
  get itinerarioBloqueado(): boolean {
    return !this.checkInDate || !this.checkOutDate;
  }

  ngOnInit(): void {
    this.cargarDestinosDisponibles();
    try {
      this.route.queryParams.subscribe(params => {
        if (params['ciudad']) { this.destino = params['ciudad']; } 
        else if (params['destino']) { this.destino = params['destino']; }

        if (params['checkIn']) {
          this.checkInDate = params['checkIn'];
          this.minCheckoutDate = DateUtils.getMinCheckoutDate(this.checkInDate);
        }
        if (params['checkOut']) {
          this.checkOutDate = params['checkOut'];
        }

        if (params['adultos']) { this.huespedes.adultos = +params['adultos'] || this.huespedes.adultos; }
        if (params['ninos']) { this.huespedes.ninos = +params['ninos'] || this.huespedes.ninos; }
        if (params['habitaciones']) { this.huespedes.habitaciones = +params['habitaciones'] || this.huespedes.habitaciones; }

        if (params['categoria']) { this.categoriaTour = params['categoria'] || ''; }
        if (params['personas']) { this.personas.total = +params['personas'] || this.personas.total; }
        
        if (params['itinerarioBasico']) {
          this.itinerarioBasico = params['itinerarioBasico'] === 'true';
        }
        
        // Validación inicial: Si faltan fechas, apagar todo
        if (this.itinerarioBloqueado) {
          this.apagarItinerarioForzoso();
        }
      });
    } catch (e) { }
  }

  // ✅ MÉTODO DE LIMPIEZA: Apaga switch y borra session
  private apagarItinerarioForzoso() {
    this.itinerarioBasico = false;
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('itinerarioBasico', 'false');
    }
  }

  // Se llama cuando el usuario intenta mover el switch manualmente
  onItinerarioChange() {
    if (this.itinerarioBloqueado) {
      // Si logró hacer click pero estaba bloqueado (por hack o error), lo apagamos
      setTimeout(() => this.apagarItinerarioForzoso(), 0);
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('itinerarioBasico', String(this.itinerarioBasico));
    }
    console.log('Modo itinerario (sesión):', this.itinerarioBasico);

    // Si ya estamos en resultados, actualizamos la URL en tiempo real
    if (this.router.url.includes('/resultados')) {
     this.mostrarLugares();
    }
  }

  // Evento para Check-In
  onCheckInChange(event: Event) {
    const checkInDate = (event.target as HTMLInputElement).value;
    this.minCheckoutDate = DateUtils.getMinCheckoutDate(checkInDate);
    this.verificarBloqueo(); // Verificar si debemos apagar el switch
  }

  // ✅ Evento para Check-Out (Nuevo)
  onCheckOutChange(event: Event) {
    this.verificarBloqueo();
  }

  // Revisa si faltan fechas y apaga el itinerario si es necesario
  verificarBloqueo() {
    if (this.itinerarioBloqueado) {
      this.apagarItinerarioForzoso();
    }
  }

  cargarDestinosDisponibles() {
    if (this.tipoBusqueda === 'hoteles') {
      this.hotelService.getHoteles().subscribe({
        next: (hoteles: HotelData[]) => {
          const ciudades = hoteles.map(hotel => hotel.ciudad).filter(ciudad => !!ciudad);
          this.lugaresDisponibles = Array.from(new Set(ciudades));
        },
        error: (error: any) => { this.lugaresDisponibles = ['Lima', 'Cusco', 'Arequipa']; }
      });
    } else if (this.tipoBusqueda === 'tours'){
      this.tourService.getTours().subscribe({
        next: (tours: TourData[]) => {
          const ciudades = tours.map(t => t.ciudad).filter(c => !!c);
          this.lugaresDisponibles = Array.from(new Set(ciudades));
        },
        error: () => { this.lugaresDisponibles = ['Lima', 'Cusco', 'Arequipa']; }
      });
    }
  }

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

  toggleGuestMenu() { this.showGuestMenu = !this.showGuestMenu; }
  toggleGuestMenuTour() { this.showGuestMenuTour = !this.showGuestMenuTour; }

  changeCount(tipo: 'adultos' | 'ninos' | 'habitaciones', cambio: number) {
    if (tipo === 'adultos') { this.huespedes.adultos = Math.max(1, this.huespedes.adultos + cambio); } 
    else if (tipo === 'ninos') { this.huespedes.ninos = Math.max(0, this.huespedes.ninos + cambio); } 
    else if (tipo === 'habitaciones') { this.huespedes.habitaciones = Math.max(1, this.huespedes.habitaciones + cambio); }
  }

  changeCountTour(tipo: 'total', cambio: number) {
    if (tipo === 'total') {
      this.personas.total =  Math.min(15, Math.max(1, this.personas.total + cambio));
    }
  }

  mostrarLugares() {
    // Antes de navegar, una última verificación de seguridad
    if (this.itinerarioBloqueado) {
      this.apagarItinerarioForzoso();
    } else if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('itinerarioBasico', String(this.itinerarioBasico));
    }

    if (this.tipoBusqueda === 'hoteles') {
      this.router.navigate(['/hoteles/resultados'], {
        queryParams: {
          ciudad: this.destino, 
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          adultos: this.huespedes.adultos,
          ninos: this.huespedes.ninos,
          habitaciones: this.huespedes.habitaciones,
          itinerarioBasico: this.itinerarioBasico
        }
      });
    } else if (this.tipoBusqueda === 'tours') {
      this.router.navigate(['/tour/resultados'], {
        queryParams: {
          destino: this.destino,
          categoria: this.categoriaTour,
          checkIn: this.checkInDate,
          checkOut: this.checkOutDate,
          personas: this.personas.total,
          itinerarioBasico: this.itinerarioBasico
        }
      });
    }
  }
}