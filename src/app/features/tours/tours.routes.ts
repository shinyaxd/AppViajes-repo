// ==========================================================
// RUTAS DEL MÓDULO DE TOURS
// ==========================================================
// Este archivo define las rutas lazy-loaded para el módulo de tours.
// Incluye lista de tours y resultados de búsqueda.

import { Routes } from '@angular/router';

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
  }
];
