import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HotelService, HotelData, Habitacion } from '../../services/hoteles.service';
import { ServicioDetalleHeaderComponent, ServicioDetalleData } from '../../../../shared/components/servicio-detalle-header/servicio-detalle-header.component';
import { ReviewsSectionComponent } from '../../../../shared/components/reviews-section/reviews-section.component';
import { DateUtils } from '../../../../shared/utils/date.utils';
import { ImageUtils } from '../../../../shared/utils/image.utils';

// 1. MOCK DATA (Mismo que en resultados para consistencia)
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

@Component({
  selector: 'app-detalles-hotel',
  templateUrl: './detalles-hotel.component.html',
  styleUrls: ['./detalles-hotel.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule, ServicioDetalleHeaderComponent, ReviewsSectionComponent]
})
export class DetallesHotelComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hotelService = inject(HotelService);

  hotel: HotelData | undefined;
  habitacionesFiltradas: Habitacion[] = [];
  mostrarBotonReservar = false;

  // Control de formulario emergente de fechas
  mostrarFormularioFechas = false;
  mensajeDisponibilidad = '';
  fechaMinimaHoy: string = DateUtils.getTodayISO();
  fechaMinimaCheckOut: string = '';

  // 🟢 NUEVAS VARIABLES: CONTROL DE MODALES DE ITINERARIO
  mostrarPreguntaItinerario = false;
  mostrarDetalleItinerario = false;
  itinerarioGenerado: any[] = [];

  // Parámetros de búsqueda
  hotelId: string | null = null;
  checkInDate = '';
  checkOutDate = '';
  adultos = 1;
  ninos = 0;
  habitaciones = 1;

  get servicioData(): ServicioDetalleData | null {
    if (!this.hotel) return null;
    // galeriaFull contiene la imagen principal (si existe) + todas las de la galería
    const galeriaFull = ImageUtils.getAllImages(this.hotel.imagen_url, this.hotel.imagenes);
    // galeriaGrid la usamos solo para mostrar 5 miniaturas en el header (el header puede calcularlo también)
    const galeriaGrid = ImageUtils.fillGallery(galeriaFull, 5, 'hotel');

    const imagenesApiObjects = (this.hotel as any).imagenes?.map((img: any) => {
      const url = typeof img === 'string' ? img : (img.url || img.imagen_url || '');
      const alt = img?.alt || img?.descripcion || img?.caption || img?.titulo || img?.alt_text || '';
      return { url, alt };
    }) || [];

    // Alts alineados con la lista completa (galeriaFull)
    const altsFull: string[] = galeriaFull.map(url => {
      const found = imagenesApiObjects.find((o: any) => o.url === url);
      if (found && found.alt && found.alt.trim().length > 0) return found.alt;
      return this.hotel?.nombre || '';
    });

    return {
      nombre: this.hotel.nombre,
      ciudad: this.hotel.ciudad,
      pais: this.hotel.pais,
      direccion: this.hotel.direccion,
      estrellas: this.hotel.estrellas,
      precio: this.precioHotelMostrado,
      descripcion: this.hotel.descripcion || '',
      // Pasamos la lista completa: el header decide el grid (5) y el viewer (hasta 6)
      galeria_imagenes: galeriaFull,
      galeria_alts: altsFull
    };
  }

  get breadcrumbItems(): string[] {
    if (!this.hotel) return [];
    return [this.hotel.ciudad, this.hotel.pais, this.hotel.nombre];
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((qParams: Record<string, any>) => {
      this.checkInDate = qParams['checkIn'] || '';
      this.checkOutDate = qParams['checkOut'] || '';
      this.adultos = +qParams['adultos'] || 1;
      this.ninos = +qParams['ninos'] || 0;
      this.habitaciones = +qParams['habitaciones'] || 1;
    });

    this.route.paramMap.subscribe((params: import('@angular/router').ParamMap) => {
      const idParam = params.get('id');
      this.hotelId = idParam;
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;
      if (hotelId) this.getHotelDetails(hotelId);
    });
  }

  getHotelDetails(id: number): void {
    this.hotelService.getHotelCompleto(id).subscribe({
      next: (detalle: any) => {
        this.hotel = detalle.hotel;
        // DEBUG: mostrar imágenes recibidas desde la API y cómo las procesa ImageUtils
        try {
          console.log('[DEBUG HOTEL IMAGES] raw hotel.imagenes:', (this.hotel as any)?.imagenes);
          const all = ImageUtils.getAllImages(this.hotel?.imagen_url, (this.hotel as any)?.imagenes || []);
          console.log('[DEBUG HOTEL IMAGES] ImageUtils.getAllImages ->', all, 'count:', all.length);
        } catch (e) {
          console.warn('[DEBUG HOTEL IMAGES] error al calcular galería:', e);
        }
        this.habitacionesFiltradas = (detalle.habitaciones as any[]).map((h: any) => ({ ...h, seleccionada: 0 }));
        this.verificarDisponibilidad();
        this.verificarSeleccion();
      },
      error: (error: any) => {
        this.hotel = undefined;
        this.habitacionesFiltradas = [];
        this.mostrarBotonReservar = false;
      }
    });
  }

  verificarDisponibilidad(): void {
    if (!this.hotel) return;
    if (!this.checkInDate || !this.checkOutDate) {
      this.mensajeDisponibilidad = '';
      return;
    }

    const disponibles = this.habitacionesFiltradas.filter(h => {
      const stock = (h.unidades_disponibles ?? h.cantidad ?? 0);
      if (stock <= 0) return false;
      
      const capacidadAdultos = h.capacidad_adultos ?? 0; 
      const capacidadNinos = h.capacidad_ninos ?? 0;     
      
      if (this.adultos > capacidadAdultos) return false;
      if (this.ninos > capacidadNinos) return false;

      return true; 
    });

    this.mensajeDisponibilidad = disponibles.length === 0
      ? '❌ El hotel no tiene disponibilidad entre las fechas seleccionadas o sus habitaciones no cumplen con los requisitos de huéspedes.'
      : '';

    this.habitacionesFiltradas = disponibles;
    this.verificarSeleccion();
  }

  // ==========================================================
  // 🟢 LÓGICA MODIFICADA: GUARDAR FECHAS
  // ==========================================================
  guardarFechas(): void {
    if (!this.checkInDate || !this.checkOutDate) {
      alert('Por favor selecciona ambas fechas.');
      return;
    }
    const noches = this.calcularNoches();
    if (noches <= 0) {
      alert('Las fechas no son válidas.');
      return;
    }
    this.mostrarFormularioFechas = false;
    this.verificarDisponibilidad();
    
    // Si guardó fechas y ya tenía selección, intentamos reservar
    // 🔥 IMPORTANTE: Pasamos 'true' porque venimos del modal de fechas
    if (this.mostrarBotonReservar) {
      this.reservarHotelFinal(true);
    }
  }

  onFechaCheckInChange(event: any): void {
    this.checkInDate = event.target.value;
    this.fechaMinimaCheckOut = DateUtils.getMinCheckoutDate(this.checkInDate);
  }

  onFechaCheckOutChange(event: any): void {
    this.checkOutDate = event.target.value;
  }

  cancelarFormularioFechas(): void {
    this.mostrarFormularioFechas = false;
  }

  get precioHotelMostrado(): number | null {
    if (!this.hotel) return null;
    if (this.hotel.precio_por_noche && this.hotel.precio_por_noche > 0)
      return this.hotel.precio_por_noche;
    const precios = this.habitacionesFiltradas.map(h => h.precio_por_noche).filter(p => p > 0);
    return precios.length > 0 ? Math.min(...precios) : null;
  }

  actualizarSeleccion(h: Habitacion, cambio: number): void {
    const limite = (h.unidades_disponibles ?? h.cantidad ?? 0);
    const prev = h.seleccionada ?? 0;
    h.seleccionada = Math.max(0, Math.min(prev + cambio, limite));
    this.verificarSeleccion();
  }

  private verificarSeleccion(): void {
    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);
    this.mostrarBotonReservar = seleccionadas.length > 0;
  }

  private calcularNoches(): number {
    if (!this.checkInDate || !this.checkOutDate) return 0;
    const toLocal = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    };
    const inD = toLocal(this.checkInDate);
    const outD = toLocal(this.checkOutDate);
    const MS_DAY = 24 * 60 * 60 * 1000;
    const diff = outD.getTime() - inD.getTime();
    return diff > 0 ? Math.round(diff / MS_DAY) : 0;
  }

  volverAResultados(): void {
    try {
      const queryParams = {
        ciudad: this.hotel?.ciudad || '',
        checkIn: this.checkInDate || '',
        checkOut: this.checkOutDate || '',
        adultos: this.adultos || 1,
        ninos: this.ninos || 0,
        habitaciones: this.habitaciones || 1
      } as Record<string, any>;
      window.history.back();
      setTimeout(() => {
        const path = window.location.pathname || '';
        if (path.includes('/detalle')) {
          this.router.navigate(['/hoteles/resultados'], { queryParams });
        }
      }, 300);
    } catch (e) {
      this.router.navigate(['/hoteles/resultados']);
    }
  }

  scrollToHabitaciones(): void {
    const element = document.getElementById('seccion-habitaciones');
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ==========================================================
  // 🟢 FLUJO DE RESERVA CON ITINERARIO
  // ==========================================================

  // 1. Valida y pregunta por itinerario (CONDICIONALMENTE)
  reservarHotelFinal(vieneDeModalFechas: boolean = false): void {
    if (!this.checkInDate || !this.checkOutDate) {
      this.mostrarFormularioFechas = true;
      return;
    }
    const noches = this.calcularNoches();
    if (noches <= 0) {
      alert('Por favor selecciona fechas válidas antes de continuar.');
      return;
    }
    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);
    if (!this.hotel || seleccionadas.length === 0) {
      alert('No hay habitaciones seleccionadas.');
      return;
    }

    // 🔥 LÓGICA "SOLO EN ESE CASO"
    // Si viene del modal de fechas, mostramos la pregunta.
    // Si ya tenía fechas (clic directo), va directo a pagos sin itinerario.
    if (vieneDeModalFechas) {
      this.mostrarPreguntaItinerario = true;
    } else {
      this.navegarAPagos(false);
    }
  }

  // Opción 2A: Rechazar itinerario
  rechazarItinerario(): void {
    this.mostrarPreguntaItinerario = false;
    
    // Limpiamos memoria para que pagos NO cobre nada extra
    if (this.hotel?.id) {
      sessionStorage.removeItem('itinerario_hotel_' + this.hotel.id);
    }
    
    // Navegamos sin itinerario
    this.navegarAPagos(false);
  }

  // Opción 2B: Aceptar itinerario -> Generar y Mostrar
  aceptarItinerario(): void {
    this.mostrarPreguntaItinerario = false;
    this.generarYGuardarItinerario();
    this.mostrarDetalleItinerario = true;
  }

  // Paso 3: Continuar al pago DESPUÉS de ver el itinerario
  continuarAlPagoConItinerario(): void {
    this.mostrarDetalleItinerario = false;
    this.navegarAPagos(true);
  }

  // Helper: Genera datos aleatorios y los guarda en SessionStorage con ID
  private generarYGuardarItinerario(): void {
    if (!this.hotel) return;

    const dias = this.calcularNoches() || 1;
    this.itinerarioGenerado = [];
    const pool = [...MOCK_ACTIVIDADES_HOTEL];

    while (this.itinerarioGenerado.length < dias) {
      pool.sort(() => 0.5 - Math.random());
      for (const actividad of pool) {
        if (this.itinerarioGenerado.length < dias) {
          this.itinerarioGenerado.push({ ...actividad });
        } else {
          break;
        }
      }
    }

    const key = 'itinerario_hotel_' + this.hotel.id;
    sessionStorage.setItem(key, JSON.stringify(this.itinerarioGenerado));
    console.log('[DETALLE] Itinerario generado y guardado:', key);
  }

  // 4. Navegación final
  private navegarAPagos(conItinerario: boolean): void {
    if (!this.hotel) return;
    const noches = this.calcularNoches();
    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);

    let total = 0;
    const queryParams: Record<string, any> = {
      hotelNombre: this.hotel.nombre,
      ubicacion: `${this.hotel.pais}, ${this.hotel.ciudad}`,
      checkIn: this.checkInDate,
      checkOut: this.checkOutDate,
      adultos: this.adultos,
      ninos: this.ninos,
      habitaciones: this.habitaciones,
      noches,
      numTiposReservados: seleccionadas.length,
      // Flag para la página de pagos
      itinerarioBasico: conItinerario 
    };

    seleccionadas.forEach((hab, i) => {
      const cant = hab.seleccionada ?? 0;
      const precio = hab.precio_por_noche;
      const subtotal = precio * cant * noches;
      total += subtotal;

      queryParams[`reserva_${i}_tipo`] = hab.nombre;
      queryParams[`reserva_${i}_cant`] = cant;
      queryParams[`reserva_${i}_precio_unitario`] = precio;
      queryParams[`reserva_${i}_precio_total`] = subtotal.toFixed(2);
      queryParams[`reserva_${i}_habitacion_id`] = hab.id;
    });

    queryParams['precioTotalGeneral'] = total.toFixed(2);
    
    try {
      const imagenPrincipal = ImageUtils.getImageUrl(this.hotel?.imagen_url, (this.hotel as any)?.imagenes, 'hotel');
      if (imagenPrincipal) queryParams['imagen'] = imagenPrincipal;
    } catch (e) {}

    this.router.navigate(['/hoteles/pagos'], { queryParams });
  }
}