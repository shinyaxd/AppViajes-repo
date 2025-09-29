import { Routes } from "@angular/router";
import { HotelesComponent } from "./componentes/paginas/hoteles/hoteles.component";
import { TourComponent } from "./componentes/paginas/tour/tour.component";
import { ResultadosHOTELESComponent } from "./componentes/resultados-hoteles/resultados-hoteles.component";
import { DetallesHotelComponent } from "./componentes/detalles-hotel/detalles-hotel.component";
import { PagosHotelesComponent } from "./componentes/pagos-hoteles/pagos-hoteles.component";



/* import { Component } from '@angular/core'; */


export const routes: Routes = [
  { path: 'hoteles', component: HotelesComponent },
  { path: 'tour', component: TourComponent },
  { path: 'resultadosHoteles', component: ResultadosHOTELESComponent},
  { path: 'detallesHotel/:id', component: DetallesHotelComponent},
  { path: 'pagos-hoteles', component: PagosHotelesComponent},
  { path: '**', redirectTo: 'hoteles' }                // Redirección a home si ruta no existe
];
