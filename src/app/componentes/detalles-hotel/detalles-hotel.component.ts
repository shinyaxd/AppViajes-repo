import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
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

  // 🔹 Parámetros de búsqueda
  hotelId: string | null = null;
  checkInDate = '';
  checkOutDate = '';
  adultos = 1;
  ninos = 0;
  habitaciones = 1;

  ngOnInit(): void {
    // 1️⃣ Leer parámetros de búsqueda (query params)
    this.route.queryParams.subscribe(qParams => {
      this.checkInDate = qParams['checkIn'] || '';
      this.checkOutDate = qParams['checkOut'] || '';
      this.adultos = +qParams['adultos'] || 1;
      this.ninos = +qParams['ninos'] || 0;
      this.habitaciones = +qParams['habitaciones'] || 1;
    });

    // 2️⃣ Leer el ID del hotel (param de ruta)
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('servicio_id');
      this.hotelId = idParam;
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;

      if (hotelId) {
        this.getHotelDetails(hotelId);
      } else {
        console.error("❌ No se encontró 'servicio_id' en los parámetros de la ruta.");
      }
    });
  }

// ==========================================================
// 🔹 Obtener detalles del hotel desde la API
// ==========================================================
getHotelDetails(id: number): void {
  console.log(`Cargando detalles para el hotel ID: ${id}`);

  this.hotelService.getHotelDetalles(id).subscribe({
    next: (detalle) => {
      console.log("✅ Detalles del hotel recibidos:", detalle);

      // ✅ Ajuste: garantizamos valores mínimos
      this.hotel = {
        ...detalle.hotel,
        imagen_url: detalle.hotel.imagen_url || 'assets/images/placeholder-hotel.jpg',
        descripcion: detalle.hotel.descripcion ?? 'Descripción no disponible',
        precio_por_noche: detalle.hotel.precio_por_noche ?? 0
      };

      // ✅ Filtramos las habitaciones según adultos / niños
      const habitacionesCompatibles = detalle.habitaciones.filter(hab =>
        hab.capacidad_adultos >= this.adultos &&
        hab.capacidad_ninos >= this.ninos
      );

      // ✅ Asignamos habitaciones filtradas
      this.habitacionesFiltradas = habitacionesCompatibles.map(hab => ({
        ...hab,
        unidades_disponibles: hab.cantidad,
        seleccionada: 0
      }));

      console.log(`🛏️ Habitaciones filtradas (${this.habitacionesFiltradas.length})`, this.habitacionesFiltradas);

      this.verificarSeleccion();
    },
    error: (error) => {
      console.error(`❌ Error al cargar el detalle del hotel ID ${id}:`, error);
      this.hotel = undefined;
      this.habitacionesFiltradas = [];
    }
  });
}


  // ==========================================================
  // 💰 Getter: calcular precio visible (mínimo entre hotel o habitaciones)
  // ==========================================================
  get precioHotelMostrado(): number | null {
    if (!this.hotel) return null;

    if (this.hotel.precio_por_noche && this.hotel.precio_por_noche > 0) {
      return this.hotel.precio_por_noche;
    }

    const precios = this.habitacionesFiltradas
      .map(h => h.precio_por_noche)
      .filter(p => p > 0);

    return precios.length > 0 ? Math.min(...precios) : null;
  }

  // ==========================================================
  // 🔸 Selección de habitaciones
  // ==========================================================
  actualizarSeleccion(habitacion: Habitacion, cambio: number): void {
    const limite = habitacion.unidades_disponibles ?? habitacion.cantidad ?? 0;
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
    if (!this.checkInDate || !this.checkOutDate) return 0;

    const dateIn = new Date(this.checkInDate);
    const dateOut = new Date(this.checkOutDate);
    const diffMs = dateOut.getTime() - dateIn.getTime();

    return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }

  // ==========================================================
  // 🔙 Volver a resultados con filtros conservados
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
  // 🧾 Generar reserva (cantidad * noches * precio)
  // ==========================================================
  reservarHotelFinal(): void {
    const noches = this.calcularNoches();
    if (noches <= 0) {
      console.error('⚠️ Fechas inválidas, no se puede continuar.');
      return;
    }

    const seleccionadas = this.habitacionesFiltradas.filter(h => (h.seleccionada ?? 0) > 0);
    if (!this.hotel || seleccionadas.length === 0) {
      console.error('⚠️ No hay habitaciones seleccionadas.');
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
      const subtotal = precio * cant * noches; // ✅ cantidad * noches * precio
      total += subtotal;

      queryParams[`reserva_${i}_tipo`] = hab.nombre;
      queryParams[`reserva_${i}_cant`] = cant;
      queryParams[`reserva_${i}_precio_unitario`] = precio;
      queryParams[`reserva_${i}_precio_total`] = subtotal.toFixed(2);
      queryParams[`reserva_${i}_id`] = hab.id;
    });

    queryParams['precioTotalGeneral'] = total.toFixed(2);

    this.router.navigate(['/pagos-hoteles'], { queryParams });
  }
}
