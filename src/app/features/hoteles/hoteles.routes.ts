// ==========================================================
// RUTAS DEL MÓDULO DE HOTELES
// ==========================================================
// Este archivo define las rutas lazy-loaded para el módulo de hoteles.
// Incluye lista, búsqueda, detalle y proceso de pago.

import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { viajeroGuard } from '../../core/guards/viajero.guard';

export const HOTELES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./components/hoteles-list/hoteles.component').then(m => m.HotelesComponent),
    title: 'Hoteles Disponibles - AppViajes'
  },
  {
    path: 'resultados',
    loadComponent: () => 
      import('./components/resultados/resultados-hoteles.component').then(m => m.ResultadosHOTELESComponent),
    title: 'Resultados de Búsqueda - Hoteles'
  },
  {
    path: 'detalle/:servicio_id',
    loadComponent: () => 
      import('./components/hotel-detalle/detalles-hotel.component').then(m => m.DetallesHotelComponent),
    title: 'Detalles del Hotel - AppViajes'
  },
  {
    path: 'pagos',
    loadComponent: () => 
      import('./components/pagos/pagos-hoteles.component').then(m => m.PagosHotelesComponent),
    canActivate: [authGuard, viajeroGuard], // Solo viajeros autenticados pueden pagar
    title: 'Pago de Reserva - AppViajes'
  }
];
