import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HotelService, HotelData, Habitacion } from '../../services/hoteles.service';
import { ServicioDetalleHeaderComponent, ServicioDetalleData } from '../../../../shared/components/servicio-detalle-header/servicio-detalle-header.component';
import { DateUtils } from '../../../../shared/utils/date.utils';
import { ImageUtils } from '../../../../shared/utils/image.utils';

@Component({
  selector: 'app-detalles-hotel',
  templateUrl: './detalles-hotel.component.html',
  styleUrls: ['./detalles-hotel.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule, ServicioDetalleHeaderComponent]
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
  fechaMinimaHoy: string = DateUtils.getTodayISO(); // Usar DateUtils
  fechaMinimaCheckOut: string = ''; // check-out depende del check-in

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
    
    // Usar ImageUtils para obtener galería de imágenes
    const galeria = ImageUtils.getAllImages(this.hotel.imagen_url, this.hotel.galeria_imagenes);
    
    // Si no hay imágenes, agregar placeholder
    const galeriaFinal = galeria.length > 0 
      ? galeria 
      : [ImageUtils.getPlaceholder('hotel')];

    return {
      nombre: this.hotel.nombre,
      ciudad: this.hotel.ciudad,
      pais: this.hotel.pais,
      direccion: this.hotel.direccion,
      estrellas: this.hotel.estrellas,
      precio: this.precioHotelMostrado,
      descripcion: this.hotel.descripcion || '',
      galeria_imagenes: galeriaFinal
    };
  }

  get breadcrumbItems(): string[] {
    if (!this.hotel) return [];
    return [this.hotel.ciudad, this.hotel.pais, this.hotel.nombre];
  }

  ngOnInit(): void {
    // Leer parámetros del query string (si existen)
    this.route.queryParams.subscribe(qParams => {
      this.checkInDate = qParams['checkIn'] || '';
      this.checkOutDate = qParams['checkOut'] || '';
      this.adultos = +qParams['adultos'] || 1;
      this.ninos = +qParams['ninos'] || 0;
      this.habitaciones = +qParams['habitaciones'] || 1;
    });

    // Leer el ID del hotel
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id'); // ✅ Cambiado de 'servicio_id' a 'id'
      this.hotelId = idParam;
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;

      if (hotelId) this.getHotelDetails(hotelId);
      else console.error("❌ No se encontró 'id' en los parámetros de la ruta.");
    });
  }

  // ==========================================================
  // 🔹 Obtener hotel y habitaciones
  // ==========================================================
  getHotelDetails(id: number): void {
    console.log(`Cargando detalles para hotel ID: ${id}`);
    this.hotelService.getHotelCompleto(id).subscribe({
      next: (detalle) => {
        this.hotel = detalle.hotel;
        this.habitacionesFiltradas = detalle.habitaciones.map(h => ({
          ...h,
          seleccionada: 0
        }));
        this.verificarDisponibilidad();
      },
      error: (error) => {
        console.error(`❌ Error al cargar el hotel ID ${id}:`, error);
        this.hotel = undefined;
        this.habitacionesFiltradas = [];
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
      return;
    }

    const disponibles = this.habitacionesFiltradas.filter(h => (h.cantidad ?? 0) > 0);

    this.mensajeDisponibilidad = disponibles.length === 0
      ? '❌ El hotel no tiene disponibilidad entre las fechas seleccionadas.'
      : '';

    this.habitacionesFiltradas = disponibles;
  }

  // ==========================================================
  // 🔸 Guardar fechas seleccionadas manualmente
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

    // Si ahora las fechas son válidas, continuar con reserva
    this.reservarHotelFinal();
  }

  // ==========================================================
  // 🔸 Control de inputs fecha
  // ==========================================================
  onFechaCheckInChange(event: any): void {
    this.checkInDate = event.target.value;
    // Usar DateUtils para calcular la fecha mínima de checkout
    this.fechaMinimaCheckOut = DateUtils.getMinCheckoutDate(this.checkInDate);
  }

  onFechaCheckOutChange(event: any): void {
    this.checkOutDate = event.target.value;
  }

  cancelarFormularioFechas(): void {
    this.mostrarFormularioFechas = false;
  }

  // ==========================================================
  // 💰 Precio visible (mínimo entre hotel o habitaciones)
  // ==========================================================
  get precioHotelMostrado(): number | null {
    if (!this.hotel) return null;

    if (this.hotel.precio_por_noche && this.hotel.precio_por_noche > 0)
      return this.hotel.precio_por_noche;

    const precios = this.habitacionesFiltradas
      .map(h => h.precio_por_noche)
      .filter(p => p > 0);

    return precios.length > 0 ? Math.min(...precios) : null;
  }

  // ==========================================================
  // 🔹 Selección de habitaciones (nuevo método para botón individual)
  // ==========================================================
  seleccionarHabitacion(habitacion: Habitacion): void {
    // Si no hay fechas, abrir modal de fechas
    if (!this.checkInDate || !this.checkOutDate) {
      this.mostrarFormularioFechas = true;
      // Marcar temporalmente esta habitación como seleccionada
      this.resetearSelecciones();
      habitacion.seleccionada = 1;
      return;
    }

    const noches = this.calcularNoches();
    if (noches <= 0) {
      alert('Por favor selecciona fechas válidas antes de continuar.');
      return;
    }

    // Resetear selecciones anteriores y seleccionar solo esta habitación
    this.resetearSelecciones();
    habitacion.seleccionada = 1;
    
    // Navegar directamente a pagos con esta habitación
    this.procesarReservaSingle(habitacion);
  }

  private resetearSelecciones(): void {
    this.habitacionesFiltradas.forEach(h => h.seleccionada = 0);
  }

  private procesarReservaSingle(habitacion: Habitacion): void {
    if (!this.hotel) return;

    const noches = this.calcularNoches();
    const cant = 1; // Una habitación por defecto
    const precio = habitacion.precio_por_noche;
    const subtotal = precio * cant * noches;

    const queryParams: Record<string, any> = {
      hotelNombre: this.hotel.nombre,
      ubicacion: `${this.hotel.pais}, ${this.hotel.ciudad}`,
      checkIn: this.checkInDate,
      checkOut: this.checkOutDate,
      adultos: this.adultos,
      ninos: this.ninos,
      habitaciones: 1,
      noches,
      numTiposReservados: 1,
      reserva_0_tipo: habitacion.nombre,
      reserva_0_cant: cant,
      reserva_0_precio_unitario: precio,
      reserva_0_precio_total: subtotal.toFixed(2),
      reserva_0_habitacion_id: habitacion.id,
      precioTotalGeneral: subtotal.toFixed(2)
    };

    console.log('✅ Reserva individual procesada. Navegando a pagos.', queryParams);
    this.router.navigate(['/pagos-hoteles'], { queryParams });
  }

  actualizarSeleccion(habitacion: Habitacion, cambio: number): void {
    const limite = habitacion.cantidad ?? 0;
    habitacion.seleccionada = Math.max(
      0,
      Math.min((habitacion.seleccionada ?? 0) + cambio, limite)
    );
    this.verificarSeleccion();
  }

  private verificarSeleccion(): void {
    this.mostrarBotonReservar = this.habitacionesFiltradas.some(
      h => (h.seleccionada ?? 0) > 0
    );
  }

  // ==========================================================
  // 📅 Cálculo de noches
  // ==========================================================
  private calcularNoches(): number {
    // Usar DateUtils para calcular noches
    return DateUtils.calculateNights(this.checkInDate, this.checkOutDate);
  }

  // ==========================================================
  // 🔙 Volver a resultados
  // ==========================================================
  volverAResultados(): void {
    if (!this.hotel) return;
    this.router.navigate(['/resultadosHoteles'], {
      queryParams: {
        ciudad: this.hotel.ciudad,
        checkIn: this.checkInDate,
        checkOut: this.checkOutDate,
        adultos: this.adultos,
        ninos: this.ninos,
        habitaciones: this.habitaciones
      }
    });
  }

  // ==========================================================
  // 📜 Scroll a sección habitaciones
  // ==========================================================
  scrollToHabitaciones(): void {
    const element = document.getElementById('seccion-habitaciones');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==========================================================
  // 🧾 Generar reserva
  // ==========================================================
  reservarHotelFinal(): void {
    // Si no hay fechas seleccionadas, mostrar formulario emergente
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

    if (this.habitacionesFiltradas.every(h => (h.cantidad ?? 0) === 0)) {
      alert('❌ El hotel no tiene disponibilidad entre las fechas seleccionadas.');
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
      
      // ✅ CORRECCIÓN: Usar 'reserva_${i}_habitacion_id' para que el componente de pagos lo reconozca.
      queryParams[`reserva_${i}_habitacion_id`] = hab.id; 
    });

    queryParams['precioTotalGeneral'] = total.toFixed(2);


    console.log('✅ VALIDACIÓN SUPERADA. Iniciando navegación a pagos.', queryParams); 
    this.router.navigate(['/pagos-hoteles'], { queryParams });
  }
}