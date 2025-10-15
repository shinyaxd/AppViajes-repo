import { Routes } from '@angular/router';
import { HotelesComponent } from './features/hoteles/components/hoteles-list/hoteles.component';
import { TourComponent } from './features/tours/components/tours-list/tour.component';
import { ResultadosHOTELESComponent } from './features/hoteles/components/resultados/resultados-hoteles.component';
import { DetallesHotelComponent } from './features/hoteles/components/hotel-detalle/detalles-hotel.component';
import { PagosHotelesComponent } from './features/hoteles/components/pagos/pagos-hoteles.component';
import { RegistroComponent } from './features/auth/components/registro/registro.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { ProveedorComponent } from './features/proveedor/components/dashboard/proveedor.component';
import { HotelFormComponent } from './features/proveedor/components/hotel-form/formulario.component'; 
import { TourFormComponent } from './features/proveedor/components/tour-form/formulario-tour.component'; 

import { authGuard } from './core/guards/auth.guard';
import { viajeroGuard } from './core/guards/viajero.guard'; 

export const routes: Routes = [
  // 🏠 Redirección raíz
  { path: '', redirectTo: 'hoteles', pathMatch: 'full' },

  // 🌍 Vistas públicas
  { path: 'hoteles', component: HotelesComponent },
  { path: 'resultadosHoteles', component: ResultadosHOTELESComponent },
  { path: 'detallesHotel/:servicio_id', component: DetallesHotelComponent },
  { path: 'pagos-hoteles', component: PagosHotelesComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'login', component: LoginComponent },
  { path: 'tour', component: TourComponent },

  // 🧳 Sección de proveedor (Rutas protegidas)
  { 
    path: 'proveedor', 
    component: ProveedorComponent, 
    // Usaremos un guard más específico para proteger las rutas de proveedor
    canActivate: [authGuard] 
  },
  
  // 3. ✅ Rutas específicas para formularios (según lo definimos en el Header)
  { 
    path: 'crear-hotel', 
    component: HotelFormComponent, 
    // Idealmente, se usaría un guard de rol aquí para solo permitir proveedores
    // canActivate: [authGuard, proveedorGuard]
    canActivate: [authGuard]
  },
  { 
    path: 'crear-tour', 
    component: TourFormComponent, 
    // canActivate: [authGuard, proveedorGuard] 
    canActivate: [authGuard]
  },

  // 🚫 Ruta no encontrada
  { path: '**', redirectTo: 'hoteles' },
];