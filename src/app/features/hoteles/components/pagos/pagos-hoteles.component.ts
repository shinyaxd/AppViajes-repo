import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../../../core/services/auth.service';
import { ReservasService, ReservaHabitacionPayload } from '../../services/reservas.service';
import { ReservasService as LocalReservasStore } from '../../../../shared/services/reservas.service';
import { firstValueFrom } from 'rxjs';

// Mock para fallback (respaldo) solamente
const MOCK_ACTIVIDADES_HOTEL_FALLBACK = [
  { id: 1, precio: 85 }, 
  { id: 2, precio: 40 }, 
  { id: 3, precio: 35 }, 
  { id: 4, precio: 60 }, 
  { id: 5, precio: 30 }, 
  { id: 6, precio: 45 } 
];

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

  // ✅ NUEVAS VARIABLES PARA ITINERARIO
  incluyeItinerario = false;
  costoItinerario = 0;

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

    this.incluyeItinerario = params['itinerarioBasico'] === 'true' || sessionStorage.getItem('itinerarioBasico') === 'true';

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

    // ✅ CALCULAR COSTO DEL ITINERARIO (Antes del total final)
    this.calcularCostoItinerario();

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

  // ✅ FUNCIÓN CORREGIDA: Busca clave única y suma solo las noches correspondientes
  private calcularCostoItinerario(): void {
    this.costoItinerario = 0;

    if (this.incluyeItinerario && this.totalNoches > 0) {
      let sumaPreciosActividades = 0;
      
      // 1. Buscar el itinerario ESPECÍFICO de este hotel usando el ID
      // Esto evita que el itinerario del Hotel A se use para cobrar el Hotel B
      const key = 'itinerario_hotel_' + this.hotelId;
      const itinerarioGuardadoStr = sessionStorage.getItem(key);
      
      let itinerarioEncontrado = false;

      if (itinerarioGuardadoStr) {
        try {
          const itinerarioGuardado = JSON.parse(itinerarioGuardadoStr);
          if (Array.isArray(itinerarioGuardado) && itinerarioGuardado.length > 0) {
            console.log(`[PAGO] Recuperado itinerario específico (${key}):`, itinerarioGuardado);
            itinerarioEncontrado = true;
            
            // Sumamos precios para CADA noche de estancia
            for (let i = 0; i < this.totalNoches; i++) {
              // Si la estancia es más larga que el itinerario guardado, repetimos cíclicamente
              // (usando el operador módulo %) para asegurar que siempre hay precio
              const index = i % itinerarioGuardado.length;
              const actividad = itinerarioGuardado[index];
              if (actividad && actividad.precio) {
                sumaPreciosActividades += actividad.precio;
              }
            }
          }
        } catch (e) {
          console.error('Error leyendo itinerario guardado', e);
        }
      } 
      
      // 2. Fallback si no se encontró nada (seguridad)
      if (!itinerarioEncontrado) {
        console.warn('[PAGO] No se encontró itinerario guardado, generando uno al azar...');
        const pool = [...MOCK_ACTIVIDADES_HOTEL_FALLBACK];
        for (let i = 0; i < this.totalNoches; i++) {
          const actividad = pool[Math.floor(Math.random() * pool.length)];
          sumaPreciosActividades += actividad.precio;
        }
      }

      const totalPersonas = (this.adultosReservados || 1) + (this.ninosReservados || 0);
      this.costoItinerario = sumaPreciosActividades * totalPersonas;
      
      console.log('[PAGO] Costo Itinerario Final:', { 
        noches: this.totalNoches,
        sumaPreciosUnitarios: sumaPreciosActividades, 
        totalPersonas, 
        costoFinal: this.costoItinerario 
      });
    }
  }

  private calcularImpuestosYTotal(): void {
    if (this.tarifaBasica > 0) {
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto + this.costoItinerario;
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
            habitaciones: this.habitacionesSolicitadas || 1,
            itinerarioBasico: this.incluyeItinerario 
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
        habitaciones: this.habitacionesSolicitadas || 1,
        itinerarioBasico: this.incluyeItinerario
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

  confirmarPago() {
    if (!this.tarjeta.nombre || !this.tarjeta.numero || !this.tarjeta.expiracion || !this.tarjeta.cvc) {
      alert('Completa todos los datos de la tarjeta.');
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