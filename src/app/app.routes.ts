/* app.routes.ts */

import { Routes } from "@angular/router";
import { HotelesComponent } from "./componentes/paginas/hoteles/hoteles.component";
import { TourComponent } from "./componentes/paginas/tour/tour.component";
import { ResultadosHOTELESComponent } from "./componentes/resultados-hoteles/resultados-hoteles.component";
import { DetallesHotelComponent } from "./componentes/detalles-hotel/detalles-hotel.component";
import { PagosHotelesComponent } from "./componentes/pagos-hoteles/pagos-hoteles.component";
import { RegistroComponent } from "./componentes/registro/registro.component";
import { LoginComponent } from "./componentes/login/login.component";


export const routes: Routes = [
  // 1. Redirección de la ruta raíz (/) a /hoteles
  { path: '', redirectTo: 'hoteles', pathMatch: 'full' }, 
  
  // 2. Página principal de búsqueda
  { path: 'hoteles', component: HotelesComponent },
  
  // 3. Página de listado de resultados
  { path: 'resultadosHoteles', component: ResultadosHOTELESComponent},
  
  // 4. Detalle del hotel, usando :servicio_id como parámetro (coherente con tu backend)
  { path: 'detallesHotel/:servicio_id', component: DetallesHotelComponent}, 
  
  // 5. Página de pago
  { path: 'pagos-hoteles', component: PagosHotelesComponent},

  // 6. Página de registro
  { path: 'registro', component: RegistroComponent},
  
  //7. Página de login
  {path:'login', component: LoginComponent},

  // 8. Página de tours
  { path: 'tour', component: TourComponent },

  // 9. Wildcard para rutas no encontradas
  { path: '**', redirectTo: 'hoteles' }                
];