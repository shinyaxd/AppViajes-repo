// ==========================================================
// RUTAS DEL MÓDULO DE TOURS
// ==========================================================
// Este archivo define las rutas lazy-loaded para el módulo de tours.
// Incluye lista de tours, resultados de búsqueda, detalle y proceso de pago.

import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { viajeroGuard } from '../../core/guards/viajero.guard';

export const TOURS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./components/tours-list/tour.component').then(m => m.TourComponent),
    title: 'Tours Disponibles - AppViajes'
  },
  {
    path: 'resultados',
    loadComponent: () => 
      import('./components/resultados/resultados-tours.component').then(m => m.ResultadosTOURSComponent),
    title: 'Resultados de Búsqueda - Tours'
  },
  {
    path: 'detalle/:id',
    loadComponent: () => 
      import('./components/tour-detalle/tour-detalle.component').then(m => m.TourDetalleComponent),
    title: 'Detalle del Tour - AppViajes'
  },
  {
    path: 'pagos',
    loadComponent: () => 
      import('./components/pagos/pagos-tours.component').then(m => m.PagosToursComponent),
    canActivate: [authGuard, viajeroGuard], // Solo viajeros autenticados pueden pagar
    title: 'Pago de Reserva - Tours'
  }
];
