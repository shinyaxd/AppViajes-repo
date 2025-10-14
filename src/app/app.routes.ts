import { Routes } from '@angular/router';
import { HotelesComponent } from './componentes/paginas/hoteles/hoteles.component';
import { TourComponent } from './componentes/paginas/tour/tour.component';
import { ResultadosHOTELESComponent } from './componentes/resultados-hoteles/resultados-hoteles.component';
import { DetallesHotelComponent } from './componentes/detalles-hotel/detalles-hotel.component';
import { PagosHotelesComponent } from './componentes/pagos-hoteles/pagos-hoteles.component';
import { RegistroComponent } from './componentes/registro/registro.component';
import { LoginComponent } from './componentes/login/login.component';
import { ProveedorComponent } from './componentes/proveedor/proveedor.component';
import { HotelFormComponent } from './componentes/formulario/formulario.component'; 
import { TourFormComponent } from './componentes/formulario-tour/formulario-tour.component'; 

import { authGuard } from './auth.guard';
// 2. ⚠️ Necesitas importar los guards de roles (asumo que se llamarán así)
// import { proveedorGuard } from './guards/proveedor.guard'; 

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