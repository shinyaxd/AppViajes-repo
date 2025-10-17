// ==========================================================
// RUTAS PRINCIPALES DE LA APLICACIÓN
// ==========================================================
// Configuración de rutas con Lazy Loading para optimizar
// el tiempo de carga inicial de la aplicación.
// Cada feature se carga bajo demanda (on-demand) cuando el usuario navega.

import { Routes } from '@angular/router';

export const routes: Routes = [
  // 🏠 Redirección raíz
  { 
    path: '', 
    redirectTo: 'hoteles', 
    pathMatch: 'full' 
  },

  // 🔐 Módulo de Autenticación (Login y Registro)
  // Se carga solo cuando el usuario accede a /auth/*
  {
    path: 'auth',
    loadChildren: () => 
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // 🏨 Módulo de Hoteles
  // Incluye: lista, búsqueda, detalles y pagos
  {
    path: 'hoteles',
    loadChildren: () => 
      import('./features/hoteles/hoteles.routes').then(m => m.HOTELES_ROUTES)
  },

  // 🌴 Módulo de Tours
  // Incluye: lista y resultados de búsqueda
  {
    path: 'tour',
    loadChildren: () => 
      import('./features/tours/tours.routes').then(m => m.TOURS_ROUTES)
  },

  // 🧳 Módulo de Proveedor (Rutas protegidas)
  // Incluye: dashboard, crear hotel, crear tour
  {
    path: 'proveedor',
    loadChildren: () => 
      import('./features/proveedor/proveedor.routes').then(m => m.PROVEEDOR_ROUTES)
  },

  // 🔄 Rutas legacy para mantener compatibilidad con URLs antiguas
  { 
    path: 'resultadosHoteles', 
    redirectTo: 'hoteles/resultados', 
    pathMatch: 'full' 
  },
  { 
    path: 'detallesHotel/:servicio_id', 
    redirectTo: 'hoteles/detalle/:servicio_id', 
    pathMatch: 'full' 
  },
  {
    path: 'detallesHotel/:id',
    redirectTo: 'hoteles/detalle/:id',
    pathMatch: 'full'
  },
  { 
    path: 'pagos-hoteles', 
    redirectTo: 'hoteles/pagos', 
    pathMatch: 'full' 
  },
  { 
    path: 'registro', 
    redirectTo: 'auth/registro', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    redirectTo: 'auth/login', 
    pathMatch: 'full' 
  },
  { 
    path: 'crear-hotel', 
    redirectTo: 'proveedor/crear-hotel', 
    pathMatch: 'full' 
  },
  { 
    path: 'crear-tour', 
    redirectTo: 'proveedor/crear-tour', 
    pathMatch: 'full' 
  },

  // 🚫 Ruta no encontrada
  { 
    path: '**', 
    redirectTo: 'hoteles' 
  }
];