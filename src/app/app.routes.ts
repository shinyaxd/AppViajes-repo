/* app.routes.ts */

import { Routes } from "@angular/router";
import { HotelesComponent } from "./componentes/paginas/hoteles/hoteles.component";
import { TourComponent } from "./componentes/paginas/tour/tour.component";
import { ResultadosHOTELESComponent } from "./componentes/resultados-hoteles/resultados-hoteles.component";
import { DetallesHotelComponent } from "./componentes/detalles-hotel/detalles-hotel.component";
import { PagosHotelesComponent } from "./componentes/pagos-hoteles/pagos-hoteles.component";
import { ResultadosTOURSComponent } from "./componentes/resultados-tours/resultados-tours.component";
import { DetallesTourComponent } from "./componentes/detalles-tour/detalles-tour.component";
import { PagosToursComponent } from "./componentes/pagos-tours/pagos-tours.component";


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
  
  // 6. Página de tours
  { path: 'tour', component: TourComponent },
  // Resultados y detalle de tours
  { path: 'resultadosTours', component: ResultadosTOURSComponent },
  { path: 'detallesTour/:servicio_id', component: DetallesTourComponent }, 
  { path: 'editarTour/:id', loadComponent: () => import('./componentes/paginas/tour/editar-tour/editar-tour.component').then(m => m.EditarTourComponent) },
  { path: 'pagos-tours', component: PagosToursComponent },

  // 7. Wildcard para rutas no encontradas
  { path: '**', redirectTo: 'hoteles' }                
];