import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService, ReservaHabitacionPayload } from '../../services/reservas.service';
import { ReservasService as LocalReservasStore } from '../../../../shared/services/reservas.service';
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
  private localReservasStore = inject(LocalReservasStore);

  // UI state
  reservaExitosa = false;
  mensajeErrorTarjeta: string = '';

  // Datos visibles
  nombreHotel = '';
  ubicacion = '';
  hotelId = 0;
  imagenHotel?: string;
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
    nombre: '',
    numero: '',
    expiracion: '',
    cvc: ''
  };

  ngOnInit(): void {
    // 1) Hidratar primero con snapshot
    this.hidratarDesdeParams(this.route.snapshot.queryParams, '[INIT][SNAPSHOT]');

    // 2) Y escuchar cambios
    this.route.queryParams.subscribe((params) => {
      this.hidratarDesdeParams(params, '[INIT][SUB]');
    });
  }

  private hidratarDesdeParams(params: any, tag: string): void {
    console.log(`${tag} params:`, params);

    const hotelNombre = params['hotelNombre'];
    const ubicacion = params['ubicacion'];
    this.hotelId = +params['hotelId'] || 0; // Importante: ID para recuperar el itinerario correcto
    const checkInStr = params['checkIn'];
    const checkOutStr = params['checkOut'];

    this.nombreHotel = hotelNombre || 'Hotel Desconocido';
    this.ubicacion = ubicacion || '';
    this.imagenHotel = params['imagen'] || params['imagen_preview'] || params['imagen_principal'] || undefined;

    this.adultosReservados = +params['adultos'] || 0;
    this.ninosReservados = +params['ninos'] || 0;
    this.habitacionesSolicitadas = +params['habitaciones'] || 0;

    this.checkIn = checkInStr ? this.parseISODateStrict(checkInStr) : null;
    this.checkOut = checkOutStr ? this.parseISODateStrict(checkOutStr) : null;

    this.totalNoches = +params['noches'] || 0;
    this.tarifaBasica = +params['precioTotalGeneral'] || 0;

    const numTiposReservados = +params['numTiposReservados'] || 0;

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
  }

  private parseISODateStrict(s: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return isNaN(dt.getTime()) ? null : dt;
  }

  private parseReserva(params: any, i: number): ReservaItem | null {
    const tipo = params[`reserva_${i}_tipo`];
    const cantidad = +params[`reserva_${i}_cant`];
    const precioNoche = +params[`reserva_${i}_precio_unitario`];
    const precioTotalReserva = +params[`reserva_${i}_precio_total`];
    const habitacionId = +params[`reserva_${i}_habitacion_id`];

    if (!tipo || !habitacionId || cantidad <= 0 || precioTotalReserva <= 0) {
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
    try {
      window.history.back();
      setTimeout(() => {
        const path = window.location.pathname || '';
        const stillOnPagos = path.includes('/pagos') || path.includes('/hoteles/pagos');
        if (stillOnPagos) {
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
  
  soloLetras(event: any) {
    event.target.value = event.target.value.replace(/[^a-zA-Z\s]/g, '');
    this.tarjeta.nombre = event.target.value;
  }

  formatearTarjeta(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();
    event.target.value = value;
    this.tarjeta.numero = value;
  }

  datosTarjetaValidos(): boolean {
    const nombreValido = (this.tarjeta.nombre || '').trim().length > 0;
    const numeroSinEspacios = this.tarjeta.numero?.replace(/\s/g, '') || '';
    const cvc = this.tarjeta.cvc || '';
    const fecha = this.tarjeta.expiracion || '';

    const datosValidos = nombreValido && numeroSinEspacios.length === 16 && /^\d{3}$/.test(cvc) && fecha !== '';
    if (!datosValidos){
      this.falloConfirmar=true;
    }
    return datosValidos;
  }

  abrirModalPago() {
    this.mostrarModalPago = true;
  }

  cerrarModal() {
    this.mostrarModalPago = false;
  }

  esTarjetaVencida(): boolean {
    if (!this.tarjeta.expiracion) return false;

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    let anioTarjeta = 0;
    let mesTarjeta = 0;

    if (this.tarjeta.expiracion.includes('/')) {
      const partes = this.tarjeta.expiracion.split('/');
      mesTarjeta = parseInt(partes[0], 10);
      anioTarjeta = parseInt(partes[1], 10);
    } else {
      return false;
    }

    // Corrección de año (2 dígitos a 4 dígitos)
    if (anioTarjeta < 100) anioTarjeta += 2000;

    // Validar que el mes sea real (1-12)
    // Si el mes no existe (ej. 13, 15, 99), lo consideramos "inválido/error"
    if (mesTarjeta < 1 || mesTarjeta > 12) return true;

    // Validaciones de tiempo
    if (anioTarjeta < anioActual) return true;
    if (anioTarjeta === anioActual && mesTarjeta < mesActual) return true;

    return false;
  }

  formatearFechaExpiracion(event: any) {
    // 1. Limpiar todo lo que NO sea número
    let input = event.target.value.replace(/\D/g, '');

    // 2. VALIDACIÓN DE MES: Si los primeros 2 dígitos son > 12, borramos el último
    if (input.length >= 2) {
      const mes = parseInt(input.substring(0, 2), 10);
      // Si el mes es 00 o mayor a 12, eliminamos el último dígito ingresado
      if (mes === 0 || mes > 12) {
        input = input.substring(0, 1);
      }
    }

    // 3. Limitar longitud total (4 dígitos: 2 mes + 2 año)
    if (input.length > 4) {
      input = input.substring(0, 4);
    }

    // 4. Agregar el slash automático
    if (input.length >= 2) {
      event.target.value = input.substring(0, 2) + '/' + input.substring(2);
    } else {
      event.target.value = input;
    }

    this.tarjeta.expiracion = event.target.value;
  }

  confirmarPago() {
    // 1. Limpiamos errores previos
    this.mensajeErrorTarjeta = '';

    // 2. Validación de campos vacíos
    if (!this.tarjeta.nombre || !this.tarjeta.numero || !this.tarjeta.expiracion || !this.tarjeta.cvc) {
      this.mensajeErrorTarjeta = 'Completa todos los datos de la tarjeta.';
      return; // Detiene el proceso, el modal sigue abierto
    }

    // 3. Validación de fecha de expiración (NUEVO)
    if (this.esTarjetaVencida()) {
    // Verificamos por qué falló
      const mes = parseInt(this.tarjeta.expiracion.split('/')[0], 10);
    
    if (mes > 12) {
        this.mensajeErrorTarjeta = 'El mes de expiración no es válido.';
    } else {
        this.mensajeErrorTarjeta = 'Tu tarjeta está vencida o la fecha es incorrecta.';
      }
    return;
    }

    this.mostrarModalPago = false;
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
        
        try {
          this.localReservasStore.addReserva({
            id: Date.now(),
            titulo: `${this.nombreHotel} — ${item.tipo}`,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            total: item.precioTotalReserva, 
            imagen: this.imagenHotel,
            adultos: this.adultosReservados,
            ninos: this.ninosReservados,
            totalPersonas: (this.adultosReservados || 0) + (this.ninosReservados || 0),
            noches: this.totalNoches,
            habitaciones: this.cantidadTotalCuartos || this.habitacionesSolicitadas,
            estado: 'confirmada',
            creadoEn: new Date().toISOString()
          });
        } catch (e) {
          console.warn('[PAGO] no se pudo guardar reserva localmente', e);
        }
        console.log('[PAGO] OK', item.tipo);
      } catch (e: any) {
        console.error('[PAGO] error', e);
        ok = false;
        alert(`Error al reservar ${item.tipo}: ${e?.message ?? 'desconocido'}`);
        break;
      }
    }

    this.reservaExitosa = ok;
  };

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}