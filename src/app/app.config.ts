// src/app/app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Importa el cliente HTTP


import { AuthInterceptor } from './componentes/paginas/hoteles/services/auth.interceptor';
import { routes } from './app.routes'; // Asume que tienes un archivo de rutas (app.routes.ts)

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Necesario para la navegación entre tus componentes (.component.ts)
    provideRouter(routes), 
    
    // 2. Fundamental para hacer peticiones GET/POST/etc. a tu backend (Laravel)
    provideHttpClient(withInterceptors([AuthInterceptor]))
  ]
};