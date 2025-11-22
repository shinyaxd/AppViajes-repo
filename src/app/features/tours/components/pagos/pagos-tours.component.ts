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
    const nombreValido = (this.tarjeta.nombre || '').trim().length > 0;
    const numeroSinEspacios = this.tarjeta.numero?.replace(/\s/g, '') || '';
    const cvc = this.tarjeta.cvc || '';
    const fecha = this.tarjeta.expiracion || '';

    const datosValidos = nombreValido && numeroSinEspacios.length === 16 && /^\d{3}$/.test(cvc) && fecha !== '';
    if (!datosValidos) {
      this.falloConfirmar = true;
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
    if (!this.tarjeta.nombre || !this.tarjeta.numero || !this.tarjeta.expiracion || !this.tarjeta.cvc) {
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

    // 👉 Mostrar el modal antes de continuar
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
      // CORRECCIÓN: Usar crearReservaTour y pasar salidaId
      await firstValueFrom(this.reservasService.crearReservaTour(this.salidaId, payload));
      
      // Al crear la reserva en el backend, también la guardamos localmente para "Mis reservas"
      try {
        this.localReservasStore.addReserva({
          id: Date.now(),
          titulo: this.nombreTour,
          // CORRECCIÓN: Usar toISODate porque fechaSalida ya es Date
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