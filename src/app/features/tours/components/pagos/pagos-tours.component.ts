import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService } from '../../../hoteles/services/reservas.service';
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

  // UI state
  reservaExitosa = false;

  // Datos del tour
  nombreTour = '';
  ubicacion = '';
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

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.hidratarDesdeParams(params);
    });
  }

  private hidratarDesdeParams(params: any): void {
    console.log('[PAGOS TOURS] params recibidos:', params);

    this.nombreTour = params['tourNombre'] || 'Tour Desconocido';
    this.ubicacion = params['ubicacion'] || '';
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
    this.router.navigate(['/tours']);
  }

  procesarPago = async (): Promise<void> => {
    if (!this.authService.isLoggedIn() || this.authService.getRole() !== 'viajero') {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (this.totalPersonas === 0) {
      alert('Datos de reserva incompletos.');
      return;
    }

    // Validar que tengamos salidaId válido
    if (!this.salidaId || this.salidaId === 0) {
      console.error('[PAGO TOUR] ❌ salidaId no válido:', this.salidaId);
      console.error('[PAGO TOUR] ℹ️ Este tour no tiene salidas disponibles en el sistema.');
      console.error('[PAGO TOUR] ℹ️ El proveedor debe crear al menos una salida para este tour.');
      alert('Este tour no tiene fechas de salida disponibles.\n\nPor favor, contacta con el proveedor o selecciona otro tour.');
      return;
    }

    // Preparar payload para reserva de tour
    // El backend espera el campo "personas" con el total
    const payload: any = {
      personas: this.totalPersonas, // Total de personas (adultos + niños)
      cantidad_adultos: this.adultos,
      cantidad_ninos: this.ninos,
    };

    try {
      console.log('[PAGO TOUR] Creando reserva para salida:', this.salidaId);
      console.log('[PAGO TOUR] Payload:', payload);
      
      await firstValueFrom(this.reservasService.crearReservaTour(this.salidaId, payload));
      console.log('[PAGO TOUR] ✅ Reserva creada exitosamente');
      
      // 🎭 SIMULACIÓN DE PAGO (ya que no hay endpoint real de pago)
      console.log('[PAGO TOUR] 💳 Simulando procesamiento de pago...');
      console.log('[PAGO TOUR] 💰 Monto a procesar: PEN', this.totalPagar.toFixed(2));
      await this.simularProcesoPago();
      console.log('[PAGO TOUR] ✅ Pago simulado completado');
      
      // Marcar como exitosa para mostrar la página de confirmación
      this.reservaExitosa = true;
    } catch (e: any) {
      console.error('[PAGO TOUR] ❌ Error:', e);
      alert(`Error al reservar: ${e?.message ?? 'Error desconocido'}`);
    }
  };

  /**
   * Simula el procesamiento del pago (ya que no existe endpoint de pago real)
   * Similar al flujo de hoteles pero con delay para simular procesamiento
   */
  private simularProcesoPago(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[PAGO SIMULADO] ✅ Transacción aprobada');
        resolve();
      }, 1000); // Simula delay de 1 segundo
    });
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
