import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService } from '../../../hoteles/services/reservas.service';
import { ReservasService as LocalReservasStore } from '../../../../shared/services/reservas.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-pagos-tours',
  standalone: true,
  templateUrl: './pagos-tours.component.html',
  styleUrls: ['./pagos-tours.component.css'],
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, DatePipe, HttpClientModule],
})
export class PagosToursComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private reservasService = inject(ReservasService);
  private localReservasStore = inject(LocalReservasStore);

  // UI state
  reservaExitosa = false;
  mensajeErrorTarjeta: string = '';

  // Datos del tour
  nombreTour = '';
  ubicacion = '';
  imagenTour?: string;
  fechaSalida: Date | null = null;
  salidaId = 0;
  tourId = 0;
  categoria = '';
  duracion = 0;

  // Personas
  adultos = 0;
  ninos = 0;
  totalPersonas = 0;

  // Precios
  precioPorPersona = 0;
  subtotal = 0;
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
    this.route.queryParams.subscribe((params) => {
      this.hidratarDesdeParams(params);
    });
  }

  private hidratarDesdeParams(params: any): void {
    console.log('[PAGOS TOURS] params recibidos:', params);

    this.nombreTour = params['tourNombre'] || 'Tour Desconocido';
    this.ubicacion = params['ubicacion'] || '';
    this.imagenTour = params['imagen'] || params['imagen_preview'] || params['imagen_principal'] || undefined;
    this.salidaId = +params['salidaId'] || 0;
    this.tourId = +params['tourId'] || 0;
    this.categoria = params['categoria'] || '';
    this.duracion = +params['duracion'] || 0;

    const fechaStr = params['fechaSalida'];
    this.fechaSalida = fechaStr ? this.parseISODate(fechaStr) : null;

    this.adultos = +params['adultos'] || 0;
    this.ninos = +params['ninos'] || 0;
    this.totalPersonas = +params['totalPersonas'] || 0;

    this.precioPorPersona = +params['precioPorPersona'] || 0;
    this.subtotal = +params['precioTotal'] || 0;

    this.calcularImpuestosYTotal();

    console.log('[PAGOS TOURS] estado hidratado:', {
      nombreTour: this.nombreTour,
      fechaSalida: this.fechaSalida,
      totalPersonas: this.totalPersonas,
      subtotal: this.subtotal,
      totalPagar: this.totalPagar
    });
  }

  private parseISODate(s: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  private calcularImpuestosYTotal(): void {
    if (this.subtotal > 0) {
      this.montoImpuesto = this.subtotal * this.impuesto;
      this.totalPagar = this.subtotal + this.montoImpuesto;
    } else {
      this.montoImpuesto = 0;
      this.totalPagar = 0;
    }
  }

  get duracionFormateada(): string {
    if (this.duracion === 0) return '';
    const horas = Math.floor(this.duracion / 60);
    const minutos = this.duracion % 60;
    if (minutos === 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
    return `${horas}h ${minutos}m`;
  }

  volverAtras(): void {
    try {
      window.history.back();
      setTimeout(() => {
        const path = window.location.pathname || '';
        const stillOnPagos = path.includes('/pagos') || path.includes('/tour/pagos');
        if (stillOnPagos) {
          const id = this.tourId || 0;
          if (id) {
            this.router.navigate(['/tour/detalle', id], { queryParams: { categoria: this.categoria || '' } });
          } else {
            this.router.navigate(['/tours']);
          }
        }
      }, 250);
    } catch (e) {
      console.error('[PAGOS TOURS] Error al intentar volver atrás:', e);
      if (this.tourId) {
        this.router.navigate(['/tour/detalle', this.tourId], { queryParams: { categoria: this.categoria || '' } });
      } else {
        this.router.navigate(['/tours']);
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

  // Modal de pago
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

    if (this.totalPersonas === 0) {
      alert('Datos de reserva incompletos.');
      return;
    }

    // Validar que tengamos salidaId válido antes de pedir tarjeta
    if (!this.salidaId || this.salidaId === 0) {
      console.error('[PAGO TOUR] ❌ salidaId no válido:', this.salidaId);
      alert('Este tour no tiene fechas de salida disponibles.\n\nPor favor, contacta con el proveedor o selecciona otro tour.');
      return;
    }

    // Mostrar el modal antes de continuar
    this.abrirModalPago();
  };

  continuarPago = async (): Promise<void> => {
    const payload: any = {
      personas: this.totalPersonas,
      cantidad_adultos: this.adultos,
      cantidad_ninos: this.ninos,
    };

    try {
      console.log('[PAGO] creando reserva...', payload);
      // Usar crearReservaTour y pasar salidaId
      await firstValueFrom(this.reservasService.crearReservaTour(this.salidaId, payload));
      
      // Al crear la reserva en el backend, también la guardamos localmente para "Mis reservas"
      try {
        this.localReservasStore.addReserva({
          id: Date.now(),
          titulo: this.nombreTour,
          // Usar toISODate porque fechaSalida ya es Date
          fecha_inicio: this.fechaSalida ? this.toISODate(this.fechaSalida) : undefined,
          fecha_fin: undefined,
          total: this.totalPagar,
          imagen: this.imagenTour,
          adultos: this.adultos,
          ninos: this.ninos,
          totalPersonas: (this.adultos || 0) + (this.ninos || 0),
          estado: 'confirmada',
          creadoEn: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[PAGO TOUR] no se pudo guardar reserva localmente', e);
      }

      this.reservaExitosa = true;
    } catch (e: any) {
      console.error('[PAGO TOUR] ❌ Error:', e);
      alert(`Error al reservar: ${e?.message ?? 'Error desconocido'}`);
    }
  };

  private toISODate(d: Date): string {
    // Helper necesario para guardar en local store
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}