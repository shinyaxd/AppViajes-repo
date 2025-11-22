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

  // 🟢 Control de formulario emergente de fechas
  mostrarFormularioFechas = false;
  mensajeDisponibilidad = '';
  fechaMinimaHoy: string = DateUtils.getTodayISO();
  fechaMinimaCheckOut: string = '';

  // 🔹 Parámetros de búsqueda
  hotelId: string | null = null;
  checkInDate = '';
  checkOutDate = '';
  adultos = 1;
  ninos = 0;
  habitaciones = 1;

  // 🔹 Datos para el componente genérico
  get servicioData(): ServicioDetalleData | null {
    if (!this.hotel) return null;
    const galeria = ImageUtils.getAllImages(this.hotel.imagen_url, this.hotel.imagenes);
    const galeriaFinal = ImageUtils.fillGallery(galeria, 5, 'hotel');

    // Intentar extraer textos 'alt' si el backend provee objetos con metadata
    const imagenesApiObjects = (this.hotel as any).imagenes?.map((img: any) => {
      const url = img.url || img.imagen_url || '';
      const alt = img.alt || img.descripcion || img.caption || img.titulo || img.alt_text || '';
      return { url, alt };
    }) || [];

    const altsFinal: string[] = galeriaFinal.map(url => {
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
      galeria_imagenes: galeriaFinal,
      galeria_alts: altsFinal
    };
  }

  get breadcrumbItems(): string[] {
    if (!this.hotel) return [];
    return [this.hotel.ciudad, this.hotel.pais, this.hotel.nombre];
  }

  // ==========================================================
  // 🔸 Ciclo de vida
  // ==========================================================
  ngOnInit(): void {
    this.route.queryParams.subscribe((qParams: Record<string, any>) => {
      this.checkInDate = qParams['checkIn'] || '';
      this.checkOutDate = qParams['checkOut'] || '';
      this.adultos = +qParams['adultos'] || 1;
      this.ninos = +qParams['ninos'] || 0;
      this.habitaciones = +qParams['habitaciones'] || 1;
      console.log('[INIT] queryParams', {
        checkIn: this.checkInDate, checkOut: this.checkOutDate,
        adultos: this.adultos, ninos: this.ninos, habitaciones: this.habitaciones
      });
    });

    this.route.paramMap.subscribe((params: import('@angular/router').ParamMap) => {
      const idParam = params.get('id');
      this.hotelId = idParam;
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;
      console.log('[INIT] route param id', { idParam, hotelId });

      if (hotelId) this.getHotelDetails(hotelId);
      else console.error("❌ No se encontró 'id' en los parámetros de la ruta.");
    });
  }

  // ==========================================================
  // 🔹 Obtener hotel y habitaciones
  // ==========================================================
  getHotelDetails(id: number): void {
    console.log(`[API] getHotelCompleto(${id})`);
    this.hotelService.getHotelCompleto(id).subscribe({
      next: (detalle: any) => {
        this.hotel = detalle.hotel;
        this.habitacionesFiltradas = (detalle.habitaciones as any[]).map((h: any) => ({ ...h, seleccionada: 0 }));
        console.log('[DATA] hotel cargado', { hotel: this.hotel?.nombre, habitaciones: this.habitacionesFiltradas.length });
        this.verificarDisponibilidad();
        this.verificarSeleccion();
      },
      error: (error: any) => {
        console.error(`❌ Error al cargar el hotel ID ${id}:`, error);
        this.hotel = undefined;
        this.habitacionesFiltradas = [];
        this.mostrarBotonReservar = false;
      }
    });
  }

  // ==========================================================
  // 🔹 Validar disponibilidad según fechas
  // ==========================================================
verificarDisponibilidad(): void {
    if (!this.hotel) return;

    if (!this.checkInDate || !this.checkOutDate) {
      this.mensajeDisponibilidad = '';
      console.log('[DISPO] sin fechas → no filtro');
      // No aplicamos ningún filtro si faltan fechas
      return;
    }

    const antes = this.habitacionesFiltradas.length;
    
    // --- Lógica de Filtrado Actualizada ---
    const disponibles = this.habitacionesFiltradas.filter(h => {
      
      // 1. FILTRO DE STOCK/UNIDADES
      const stock = (h.unidades_disponibles ?? h.cantidad ?? 0);
      if (stock <= 0) {
        return false; // No hay stock
      }
      
      // 2. FILTRO DE CAPACIDAD POR HUÉSPEDES (NUEVA LÓGICA)
      // Asumimos que la habitación debe tener la capacidad para alojar a TODOS los adultos/niños buscados
      // Si el hotel permite alojar X adultos en Y habitaciones, esta lógica debe ser más compleja.
      // Aquí, filtramos la habitación si su capacidad es menor a lo que busca el usuario.
      
      const capacidadAdultos = h.capacidad_adultos ?? 0; // Se asume esta propiedad existe
      const capacidadNinos = h.capacidad_ninos ?? 0;     // Se asume esta propiedad existe
      
      if (this.adultos > capacidadAdultos) {
        console.log(`[DISPO] ❌ Habitación ${h.id} (${h.nombre}) filtrada: Adultos buscados (${this.adultos}) > Capacidad Adultos (${capacidadAdultos})`);
        return false;
      }
      
      if (this.ninos > capacidadNinos) {
        console.log(`[DISPO] ❌ Habitación ${h.id} (${h.nombre}) filtrada: Niños buscados (${this.ninos}) > Capacidad Niños (${capacidadNinos})`);
        return false;
      }

      return true; // Pasa ambos filtros: tiene stock y tiene capacidad suficiente
    });
    // --- Fin de Lógica de Filtrado Actualizada ---

    this.mensajeDisponibilidad = disponibles.length === 0
      ? '❌ El hotel no tiene disponibilidad entre las fechas seleccionadas o sus habitaciones no cumplen con los requisitos de huéspedes.'
      : '';

    this.habitacionesFiltradas = disponibles;
    console.log('[DISPO] filtrado por fechas y capacidad', { antes, despues: disponibles.length, mensaje: this.mensajeDisponibilidad });
    this.verificarSeleccion();
  }
  // ==========================================================
  // 🔸 Guardar fechas seleccionadas manualmente (modal)
  // ==========================================================
  guardarFechas(): void {
    console.log('[MODAL] guardarFechas click', { checkIn: this.checkInDate, checkOut: this.checkOutDate });
    if (!this.checkInDate || !this.checkOutDate) {
      alert('Por favor selecciona ambas fechas.');
      console.warn('[MODAL] faltan fechas');
      return;
    }

    const noches = this.calcularNoches();
    console.log('[MODAL] noches calculadas', { noches });
    if (noches <= 0) {
      alert('Las fechas no son válidas.');
      console.warn('[MODAL] noches <= 0');
      return;
    }

    this.mostrarFormularioFechas = false;
    this.verificarDisponibilidad();
    this.reservarHotelFinal(); // vuelve al flujo multi
  }

  // ==========================================================
  // 🔸 Control de inputs fecha
  // ==========================================================
  onFechaCheckInChange(event: any): void {
    this.checkInDate = event.target.value;
    this.fechaMinimaCheckOut = DateUtils.getMinCheckoutDate(this.checkInDate);
    console.log('[UI] checkIn change', { checkIn: this.checkInDate, minCheckout: this.fechaMinimaCheckOut });
  }

  onFechaCheckOutChange(event: any): void {
    this.checkOutDate = event.target.value;
    console.log('[UI] checkOut change', { checkOut: this.checkOutDate });
  }

  cancelarFormularioFechas(): void {
    this.mostrarFormularioFechas = false;
    console.log('[UI] modal fechas → cancelar');
  }

  // ==========================================================
  // 💰 Precio visible (mínimo entre hotel o habitaciones)
  // ==========================================================
  get precioHotelMostrado(): number | null {
    if (!this.hotel) return null;

    if (this.hotel.precio_por_noche && this.hotel.precio_por_noche > 0)
      return this.hotel.precio_por_noche;

    const precios = this.habitacionesFiltradas.map(h => h.precio_por_noche).filter(p => p > 0);
    return precios.length > 0 ? Math.min(...precios) : null;
  }

  // ==========================================================
  // 🔹 Selección de habitaciones (+ / −)
  // ==========================================================
  actualizarSeleccion(h: Habitacion, cambio: number): void {
    const limite = (h.unidades_disponibles ?? h.cantidad ?? 0);
    const prev = h.seleccionada ?? 0;
    h.seleccionada = Math.max(0, Math.min(prev + cambio, limite));
    console.log('[UI] cambiar seleccion', { id: h.id, nombre: h.nombre, prev, cambio, limite, ahora: h.seleccionada });
    this.verificarSeleccion();
  }

  private verificarSeleccion(): void {
    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);
    this.mostrarBotonReservar = seleccionadas.length > 0;
    console.log('[STATE] verificarSeleccion', { haySeleccion: this.mostrarBotonReservar, seleccionadas: seleccionadas.map(s => ({ id: s.id, cant: s.seleccionada })) });
  }

  // ==========================================================
  // 📅 Cálculo de noches (LOCAL, sin sorpresas de timezone)
  // ==========================================================
  private calcularNoches(): number {
    if (!this.checkInDate || !this.checkOutDate) return 0;

    // Parse YYYY-MM-DD a fecha LOCAL (00:00 local)
    const toLocal = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    };
    const inD = toLocal(this.checkInDate);
    const outD = toLocal(this.checkOutDate);

    const MS_DAY = 24 * 60 * 60 * 1000;
    const diff = outD.getTime() - inD.getTime();
    const noches = diff > 0 ? Math.round(diff / MS_DAY) : 0;
    return noches;
  }

  // ==========================================================
  // 🔙 Volver a resultados
  // ==========================================================
  volverAResultados(): void {
    // Intentar volver en el historial del navegador (si existe). Si no cambia la ruta, navegar al fallback
    try {
      const queryParams = {
        ciudad: this.hotel?.ciudad || '',
        checkIn: this.checkInDate || '',
        checkOut: this.checkOutDate || '',
        adultos: this.adultos || 1,
        ninos: this.ninos || 0,
        habitaciones: this.habitaciones || 1
      } as Record<string, any>;

      // Intento principal: history.back() (mantiene estado si venías de la página de resultados)
      window.history.back();

      // Después de un pequeño delay, si seguimos en una ruta de detalle, hacer fallback a la ruta de resultados con los query params
      setTimeout(() => {
        const path = window.location.pathname || '';
        const isStillDetail = path.includes('/detalle') || path.includes('/hoteles/detalle');
        if (isStillDetail) {
          this.router.navigate(['/hoteles/resultados'], { queryParams });
        }
      }, 300);
    } catch (e) {
      console.error('[NAV] Excepción en volverAResultados (hotel):', e);
      this.router.navigate(['/hoteles/resultados'], {
        queryParams: {
          ciudad: this.hotel?.ciudad || '',
          checkIn: this.checkInDate || '',
          checkOut: this.checkOutDate || '',
          adultos: this.adultos || 1,
          ninos: this.ninos || 0,
          habitaciones: this.habitaciones || 1
        }
      });
    }
  }

  // ==========================================================
  // 📜 Scroll
  // ==========================================================
  scrollToHabitaciones(): void {
    const element = document.getElementById('seccion-habitaciones');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('[UI] scroll a seccion-habitaciones');
    }
  }

  // ==========================================================
  // 🧾 Generar reserva (multi) → NAV a pagos-hoteles
  // ==========================================================
  reservarHotelFinal(): void {
    console.log('[RESERVA] iniciar', { checkIn: this.checkInDate, checkOut: this.checkOutDate });

    if (!this.checkInDate || !this.checkOutDate) {
      this.mostrarFormularioFechas = true;
      console.warn('[RESERVA] faltan fechas → abrir modal');
      return;
    }

    const noches = this.calcularNoches();
    console.log('[RESERVA] noches calculadas', { noches });
    if (noches <= 0) {
      alert('Por favor selecciona fechas válidas antes de continuar.');
      console.warn('[RESERVA] noches <= 0');
      return;
    }

    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);
    console.log('[RESERVA] seleccionadas', seleccionadas.map(h => ({ id: h.id, cant: h.seleccionada, precio: h.precio_por_noche })));
    if (!this.hotel || seleccionadas.length === 0) {
      alert('No hay habitaciones seleccionadas.');
      console.warn('[RESERVA] sin seleccionadas');
      return;
    }

    if (this.habitacionesFiltradas.every(h => (h.unidades_disponibles ?? h.cantidad ?? 0) === 0)) {
      alert('❌ El hotel no tiene disponibilidad entre las fechas seleccionadas.');
      console.warn('[RESERVA] sin disponibilidad');
      return;
    }

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
    
    // Incluir imagen principal del hotel en los query params para que la página de pagos
    // y la lista 'Mis reservas' puedan mostrar una miniatura coherente.
    try {
      const imagenPrincipal = ImageUtils.getImageUrl(this.hotel?.imagen_url, (this.hotel as any)?.imagenes, 'hotel');
      if (imagenPrincipal) queryParams['imagen'] = imagenPrincipal;
    } catch (e) {
      console.warn('[NAV] no se pudo calcular imagenPrincipal para queryParams', e);
    }

    console.log('[NAV] ruta destino:', '/hoteles/pagos');
    console.log('[NAV] queryParams:', queryParams);
    this.router.navigate(['/hoteles/pagos'], { queryParams })
      .then((ok: boolean) => console.log('[NAV] navigate() result:', ok));
  }
}
