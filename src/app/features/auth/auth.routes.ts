// ==========================================================
// RUTAS DEL MÓDULO DE AUTENTICACIÓN
// ==========================================================
// Este archivo define las rutas lazy-loaded para el módulo de autenticación.
// Incluye las rutas de login y registro que se cargan bajo demanda.

import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => 
      import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'Iniciar Sesión - AppViajes'
  },
  {
    path: 'registro',
    loadComponent: () => 
      import('./components/registro/registro.component').then(m => m.RegistroComponent),
    title: 'Registro - AppViajes'
  },
  
  // Redirección por defecto al login
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
