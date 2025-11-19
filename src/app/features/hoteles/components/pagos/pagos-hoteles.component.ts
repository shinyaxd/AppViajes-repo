import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService, ReservaHabitacionPayload } from '../../services/reservas.service';
import { firstValueFrom } from 'rxjs';

interface ReservaItem {
  habitacionId: number;
  tipo: string;
  cantidad: number;
  precioNoche: number;
  precioTotalReserva: number;
}

@Component({
  selector: 'app-pagos-hoteles',
  standalone: true,
  templateUrl: './pagos-hoteles.component.html',
  styleUrls: ['./pagos-hoteles.component.css'],
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, DatePipe, HttpClientModule],
})
export class PagosHotelesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private reservasService = inject(ReservasService);

  // UI state
  reservaExitosa = false;

  // Datos visibles
  nombreHotel = '';
  ubicacion = '';
  hotelId = 0;
  checkIn: Date | null = null;
  checkOut: Date | null = null;

  adultosReservados = 0;
  ninosReservados = 0;
  habitacionesSolicitadas = 0;

  reservas: ReservaItem[] = [];
  cantidadTotalCuartos = 0;

  totalNoches = 0;
  tarifaBasica = 0;
  impuesto = 0.18;
  montoImpuesto = 0;
  totalPagar = 0;

  // Datos para simular pasarela
  mostrarModalPago = false;
  falloConfirmar: boolean = false;

  tarjeta = {
    numero: '',
    expiracion: '',
    cvc: ''
  };

  ngOnInit(): void {
    // 1) Hidratar primero con snapshot (por si ya están los params)
    this.hidratarDesdeParams(this.route.snapshot.queryParams, '[INIT][SNAPSHOT]');

    // 2) Y escuchar cambios (por si navegan dentro de la sección y cambian algo)
    this.route.queryParams.subscribe((params) => {
      this.hidratarDesdeParams(params, '[INIT][SUB]');
    });
  }

  private hidratarDesdeParams(params: any, tag: string): void {
    console.log(`${tag} params:`, params);

    // Seguridad: si no vienen cosas clave, lo vas a ver aquí.
  const hotelNombre = params['hotelNombre'];
    const ubicacion = params['ubicacion'];
  this.hotelId = +params['hotelId'] || 0;
    const checkInStr = params['checkIn'];
    const checkOutStr = params['checkOut'];

    // Logs base
    console.log(`${tag} base`, { hotelNombre, ubicacion, checkInStr, checkOutStr });

    // Texto
    this.nombreHotel = hotelNombre || 'Hotel Desconocido';
    this.ubicacion = ubicacion || '';

    // Números (usar + para coaccionar)
    this.adultosReservados = +params['adultos'] || 0;
    this.ninosReservados = +params['ninos'] || 0;
    this.habitacionesSolicitadas = +params['habitaciones'] || 0;

    // Fechas
    this.checkIn = checkInStr ? this.parseISODateStrict(checkInStr) : null;
    this.checkOut = checkOutStr ? this.parseISODateStrict(checkOutStr) : null;

    // Noches y totales
    this.totalNoches = +params['noches'] || 0;
    this.tarifaBasica = +params['precioTotalGeneral'] || 0;

    const numTiposReservados = +params['numTiposReservados'] || 0;
    console.log(`${tag} tipologías:`, numTiposReservados);

    // Habitaciones
    this.reservas = [];
    this.cantidadTotalCuartos = 0;

    for (let i = 0; i < numTiposReservados; i++) {
      const r = this.parseReserva(params, i);
      if (r) {
        this.reservas.push(r);
        this.cantidadTotalCuartos += r.cantidad;
      }
    }

    // Cálculo final
    this.calcularImpuestosYTotal();

    // Dump final para validar que todo quedó OK
    console.log(`${tag} estado final`, {
      nombreHotel: this.nombreHotel,
      ubicacion: this.ubicacion,
      checkIn: this.checkIn,
      checkOut: this.checkOut,
      adultosReservados: this.adultosReservados,
      ninosReservados: this.ninosReservados,
      habitacionesSolicitadas: this.habitacionesSolicitadas,
      totalNoches: this.totalNoches,
      tarifaBasica: this.tarifaBasica,
      reservas: this.reservas,
      cantidadTotalCuartos: this.cantidadTotalCuartos,
      montoImpuesto: this.montoImpuesto,
      totalPagar: this.totalPagar,
    });
  }

  private parseISODateStrict(s: string): Date | null {
    // Espera YYYY-MM-DD — si no calza, devuelve null
    // (evita que un string raro “rompa” el DatePipe)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return isNaN(dt.getTime()) ? null : dt;
    // Nota: lo tratamos como fecha "local" 00:00 para estabilidad visual.
  }

  private parseReserva(params: any, i: number): ReservaItem | null {
    const tipo = params[`reserva_${i}_tipo`];
    const cantidad = +params[`reserva_${i}_cant`];
    const precioNoche = +params[`reserva_${i}_precio_unitario`];
    const precioTotalReserva = +params[`reserva_${i}_precio_total`];
    const habitacionId = +params[`reserva_${i}_habitacion_id`];

    const bloque = { tipo, cantidad, precioNoche, precioTotalReserva, habitacionId };
    console.log('[RESERVA][parse]', i, bloque);

    if (!tipo || !habitacionId || cantidad <= 0 || precioTotalReserva <= 0) {
      console.warn('[RESERVA][skip] bloque inválido', i, bloque);
      return null;
    }

    return { habitacionId, tipo, cantidad, precioNoche, precioTotalReserva };
  }

  private calcularImpuestosYTotal(): void {
    if (this.tarifaBasica > 0) {
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto;
    } else {
      this.montoImpuesto = 0;
      this.totalPagar = 0;
    }
  }

  volverAtras(): void {
    // Intentar volver en el historial del navegador primero (mantiene estado si venías del detalle)
    try {
      window.history.back();

      // Si después de un corto delay seguimos en la página de pagos, navegar al detalle del hotel con los query params necesarios
      setTimeout(() => {
        const path = window.location.pathname || '';
        const stillOnPagos = path.includes('/pagos') || path.includes('/hoteles/pagos');
        if (stillOnPagos) {
          // Fallback: si tenemos hotelId, ir al detalle; si no, ir a resultados con filtros
          const ciudadFromUbicacion = (this.ubicacion || '').split(',').pop()?.trim() || '';
          const qp: Record<string, any> = {
            ciudad: ciudadFromUbicacion,
            checkIn: this.checkIn ? this.toISODate(this.checkIn) : '',
            checkOut: this.checkOut ? this.toISODate(this.checkOut) : '',
            adultos: this.adultosReservados || 1,
            ninos: this.ninosReservados || 0,
            habitaciones: this.habitacionesSolicitadas || 1
          };

          if (this.hotelId) {
            this.router.navigate(['/hoteles/detalle', this.hotelId], { queryParams: qp });
          } else {
            this.router.navigate(['/hoteles/resultados'], { queryParams: qp });
          }
        }
      }, 250);
    } catch (e) {
      console.error('[PAGOS HOTELES] Error al intentar volver atrás:', e);
      // Fallback directo
      const ciudadFromUbicacion = (this.ubicacion || '').split(',').pop()?.trim() || '';
      const qp: Record<string, any> = {
        ciudad: ciudadFromUbicacion,
        checkIn: this.checkIn ? this.toISODate(this.checkIn) : '',
        checkOut: this.checkOut ? this.toISODate(this.checkOut) : '',
        adultos: this.adultosReservados || 1,
        ninos: this.ninosReservados || 0,
        habitaciones: this.habitacionesSolicitadas || 1
      };
      if (this.hotelId) {
        this.router.navigate(['/hoteles/detalle', this.hotelId], { queryParams: qp });
      } else {
        this.router.navigate(['/hoteles/resultados'], { queryParams: qp });
      }
    }
  }
  soloNumeros(event: any) {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
  }
  formatearTarjeta(event: any) {
    // Elimina todo lo que no sea número
    let value = event.target.value.replace(/\D/g, '');

    // Máximo 16 dígitos
    value = value.substring(0, 16);

    // Inserta espacios cada 4 dígitos
    value = value.replace(/(.{4})/g, '$1 ').trim();

    event.target.value = value;
    this.tarjeta.numero = value;
  }

  // Validación total de los campos
  datosTarjetaValidos(): boolean {
    const numeroSinEspacios = this.tarjeta.numero?.replace(/\s/g, '') || '';
    const cvc = this.tarjeta.cvc || '';
    const fecha = this.tarjeta.expiracion || '';

    const datosValidos=numeroSinEspacios.length === 16 && /^\d{3}$/.test(cvc) && fecha !== '';
    if (!datosValidos){
      this.falloConfirmar=true;
    }

    return datosValidos;
  }

  // Modal de pago
  abrirModalPago() {
    this.mostrarModalPago = true;
  }

  cerrarModal() {
    this.mostrarModalPago = false;
  }

  confirmarPago() {
    if (!this.tarjeta.numero || !this.tarjeta.expiracion || !this.tarjeta.cvc) {
      alert('Completa todos los datos de la tarjeta.');
      return;
    }

    // Cierra modal
    this.mostrarModalPago = false;

    // Continúa el flujo de procesarPago
    this.continuarPago();
  }

  procesarPago = async (): Promise<void> => {
    if (!this.reservasService || !this.authService) {
      alert('Servicios no disponibles.');
      return;
    }

    if (!this.authService.isLoggedIn() || this.authService.getRole() !== 'viajero') {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    // 👉 Mostrar el modal antes de continuar
    this.abrirModalPago();
  };


  continuarPago  = async (): Promise<void> => {
    const fechaInicio = this.checkIn ? this.toISODate(this.checkIn) : null;
    const fechaFin = this.checkOut ? this.toISODate(this.checkOut) : null;

    if (!fechaInicio || !fechaFin || this.reservas.length === 0) {
      alert('Datos de reserva incompletos.');
      return;
    }

    let ok = true;
    for (const item of this.reservas) {
      const payload: ReservaHabitacionPayload = {
        habitacion_id: item.habitacionId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        cantidad: item.cantidad,
      };

      try {
        console.log('[PAGO] creando reserva...', payload);
        await firstValueFrom(this.reservasService.crearReservaHotel(payload));
        console.log('[PAGO] OK', item.tipo);
      } catch (e: any) {
        console.error('[PAGO] error', e);
        ok = false;
        alert(`Error al reservar ${item.tipo}: ${e?.message ?? 'desconocido'}`);
        break;
      }
    }

    // Marcar como exitosa para mostrar la página de confirmación
    this.reservaExitosa = ok;
  };

  private toISODate(d: Date): string {
    // YYYY-MM-DD (sin zona horaria)
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
