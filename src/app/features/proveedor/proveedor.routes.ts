// ==========================================================
// RUTAS DEL MÓDULO DE PROVEEDOR
// ==========================================================
// Este archivo define las rutas lazy-loaded para el módulo de proveedor.
// Incluye dashboard y formularios para crear hoteles y tours.
// TODAS las rutas están protegidas con authGuard.

import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PROVEEDOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./components/dashboard/proveedor.component').then(m => m.ProveedorComponent),
    canActivate: [authGuard],
    title: 'Panel de Proveedor - AppViajes'
  },
  {
    path: 'crear-hotel',
    loadComponent: () => 
      import('./components/hotel-form/formulario.component').then(m => m.HotelFormComponent),
    canActivate: [authGuard],
    title: 'Crear Hotel - Panel Proveedor'
  },
  {
    path: 'crear-tour',
    loadComponent: () => 
      import('./components/tour-form/formulario-tour.component').then(m => m.TourFormComponent),
    canActivate: [authGuard],
    title: 'Crear Tour - Panel Proveedor'
  },
  {
    path: 'editar-hotel/:id',
    loadComponent: () => 
      import('./components/hotel-form/formulario.component').then(m => m.HotelFormComponent),
    canActivate: [authGuard],
    title: 'Editar Hotel - Panel Proveedor'
  },
  {
    path: 'editar-tour/:id',
    loadComponent: () => 
      import('./components/editar-tour/editar-tour.component').then(m => m.EditarTourComponent),
    canActivate: [authGuard],
    title: 'Editar Tour - Panel Proveedor'
  }
];
