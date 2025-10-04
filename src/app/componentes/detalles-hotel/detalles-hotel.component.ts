import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
// Importamos los tipos actualizados de tu servicio
import { HotelService, HotelData, Habitacion } from '../paginas/hoteles/services/hoteles.service';

@Component({
  selector: 'app-detalles-hotel',
  templateUrl: './detalles-hotel.component.html',
  styleUrls: ['./detalles-hotel.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule]
})
export class DetallesHotelComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hotelService = inject(HotelService);

  hotel: HotelData | undefined;
  habitacionesFiltradas: Habitacion[] = [];
  mostrarBotonReservar = false;

  // Propiedad para el HTML de prueba
  hotelId: string | null = null; 

  checkInDate: string = '';
  checkOutDate: string = '';
  adultos: number = 1;
  ninos: number = 0;
  habitaciones: number = 1;

  constructor() {}

  ngOnInit(): void {
    // 1. Obtiene los parámetros de consulta (fechas, personas)
    this.route.queryParams.subscribe(qParams => {
      this.checkInDate = qParams['checkIn'] || '';
      this.checkOutDate = qParams['checkOut'] || '';
      this.adultos = +qParams['adultos'] || 1;
      this.ninos = +qParams['ninos'] || 0;
      this.habitaciones = +qParams['habitaciones'] || 1;
    });

    // 2. Obtiene el parámetro de la ruta (ID del hotel)
    this.route.paramMap.subscribe(params => {
      // Usamos 'servicio_id' según la configuración de la ruta
      const idParam = params.get('servicio_id'); 
      this.hotelId = idParam; 
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;
      
      if (hotelId) {
        this.getHotelDetails(hotelId);
      } else {
        console.error("No se encontró 'servicio_id' en los parámetros de la ruta.");
      }
    });
  }

  // ==========================================================
  // 💡 NUEVA LÓGICA DE PRECIO (Getter)
  // Este getter se usa en el HTML del encabezado para mostrar el precio.
  // 1. Usa el precio principal del hotel.
  // 2. Si es nulo o cero, usa el precio mínimo de las habitaciones disponibles.
  // ==========================================================
  get precioHotelMostrado(): number | null {
    if (!this.hotel) {
      return null;
    }

    // 1. Intentar usar el precio_por_noche principal del hotel
    if (this.hotel.precio_por_noche && this.hotel.precio_por_noche > 0) {
      return this.hotel.precio_por_noche;
    }

    // 2. Si no hay precio principal, buscar el precio mínimo de las habitaciones filtradas
    if (this.habitacionesFiltradas.length > 0) {
      const precios = this.habitacionesFiltradas
        .map(hab => hab.precio_por_noche)
        .filter(precio => precio > 0);
      
      if (precios.length > 0) {
        // Devuelve el precio más bajo encontrado
        return Math.min(...precios);
      }
    }
    
    // 3. Si no hay nada, devuelve null
    return null;
  }
  // ==========================================================


  getHotelDetails(id: number): void {
    console.log(`Cargando detalles para el hotel ID: ${id}`);
    // El servicio maneja la transformación de imagen_url (array) a imagen_principal (string)
    this.hotelService.getHotelDetalles(id).subscribe({
      next: (detalle) => {
        console.log("Detalles del hotel recibidos con éxito.");
        
        // Log para debuggear: Revisa el valor del precio que viene de la API
        console.log(`Precio del hotel (API): ${detalle.hotel.precio_por_noche}`);
        console.log(`Descripción del hotel (API): ${detalle.hotel.descripcion}`);
        
        this.hotel = detalle.hotel;
        // La lógica de filtrado se aplicará a detalle.habitaciones
        this.habitacionesFiltradas = detalle.habitaciones.map(hab => ({
          ...hab,
          seleccionada: 0
        }));

        // NOTA: Se eliminó la llamada a filtrarHabitacionesPorCapacidad() aquí
        // porque ya estás asignando las habitaciones directamente desde la API
        // y solo tienes que filtrar por capacidad si las quieres limitar.
        // Si necesitas filtrar, usa las habitaciones directamente de la API (detalle.habitaciones)
        // en lugar de la propiedad (this.hotel as any).habitaciones, ya que esa no existe.
        
        this.verificarSeleccion();
      },
      error: error => {
        console.error(`Error al cargar el detalle del hotel ID ${id} desde la API:`, error);
        this.hotel = undefined;
        this.habitacionesFiltradas = [];
      }
    });
  }

  private filtrarHabitacionesPorCapacidad(): void {
    if (!this.hotel) {
      this.habitacionesFiltradas = [];
      return;
    }
    const adultosSolicitados = this.adultos;
    const ninosSolicitados = this.ninos;
    
    // 💡 CORRECCIÓN: Tu objeto HotelData del servicio NO tiene una propiedad 'habitaciones'. 
    // Las habitaciones vienen separadas en el objeto HotelDetalles y se almacenan en habitacionesFiltradas. 
    // Si quieres re-filtrar, debes usar el array completo de habitaciones si lo guardaste en otra variable. 
    // Dejaremos la lógica de filtrado inicial en el servicio por ahora.
    
    console.warn("La función filtrarHabitacionesPorCapacidad está deshabilitada por ahora. El filtrado debe ocurrir en el servicio o al inicio de getHotelDetails.");
    // Deberías guardar el array completo de habitaciones aquí:
    // const todasLasHabitaciones = ... // Array de habitaciones sin filtrar.

    // Si quieres que el componente maneje el filtrado, necesitas guardar todas las habitaciones 
    // que vienen de la API en una variable local (ej: `todasLasHabitaciones: Habitacion[] = []`)
    
    this.habitacionesFiltradas = this.habitacionesFiltradas // Usamos las ya cargadas
      .filter((habitacion: Habitacion) =>
        (habitacion.capacidad_adultos >= adultosSolicitados) &&
        (habitacion.capacidad_ninos >= ninosSolicitados) &&
        ((habitacion.unidades_disponibles ?? habitacion.cantidad ?? 0) > 0)
      )
      .map((hab: Habitacion) => ({
        ...hab,
        seleccionada: 0
      }));
  }

  actualizarSeleccion(habitacion: Habitacion, cambio: number): void {
    if (habitacion.seleccionada === undefined) {
      habitacion.seleccionada = 0;
    }
    const limite = habitacion.unidades_disponibles ?? habitacion.cantidad ?? 0;
    const nuevaCantidad = habitacion.seleccionada + cambio;
    if (nuevaCantidad >= 0 && nuevaCantidad <= limite) {
      habitacion.seleccionada = nuevaCantidad;
    }
    this.verificarSeleccion();
  }

  private verificarSeleccion(): void {
    this.mostrarBotonReservar = this.habitacionesFiltradas.some(hab => (hab.seleccionada ?? 0) > 0);
  }

  private calcularNoches(): number {
    if (!this.checkInDate || !this.checkOutDate) {
      return 0;
    }
    const dateIn = new Date(this.checkInDate + 'T00:00:00');
    const dateOut = new Date(this.checkOutDate + 'T00:00:00');
    const diffTime = Math.abs(dateOut.getTime() - dateIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  reservarHotelFinal(): void {
    const nochesReservadas = this.calcularNoches();
    if (nochesReservadas <= 0) {
      console.error('Error: Las fechas son inválidas o la duración es cero. Abortando navegación.');
      return;
    }
    const reservasSeleccionadas = this.habitacionesFiltradas
      .filter(hab => (hab.seleccionada ?? 0) > 0);
    if (!this.hotel || reservasSeleccionadas.length === 0) {
      console.error('No hay hotel o habitaciones seleccionadas para reservar. Abortando navegación.');
      return;
    }
    let precioTotalGeneral = 0;
    const queryParams: { [key: string]: any } = {
      hotelNombre: this.hotel.nombre,
      ubicacion: this.hotel.pais + ', ' + this.hotel.ciudad,
      checkIn: this.checkInDate,
      checkOut: this.checkOutDate,
      adultos: this.adultos,
      ninos: this.ninos,
      habitaciones: this.habitaciones,
      numTiposReservados: reservasSeleccionadas.length,
      noches: nochesReservadas,
    };
    reservasSeleccionadas.forEach((hab, index) => {
      const cantidad = hab.seleccionada ?? 0;
      const precioUnitario = hab.precio_por_noche;
      const precioTotalHabitacion = precioUnitario * cantidad * nochesReservadas;
      precioTotalGeneral += precioTotalHabitacion;
      queryParams[`reserva_${index}_tipo`] = hab.nombre;
      queryParams[`reserva_${index}_cant`] = cantidad;
      queryParams[`reserva_${index}_precio_unitario`] = precioUnitario;
      queryParams[`reserva_${index}_precio_total`] = precioTotalHabitacion.toFixed(2);
      queryParams[`reserva_${index}_id`] = hab.id;
    });
    queryParams['precioTotalGeneral'] = precioTotalGeneral.toFixed(2);
    this.router.navigate(['/pagos-hoteles'], {
      queryParams: queryParams
    });
  }
}