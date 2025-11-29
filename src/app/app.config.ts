// src/app/app.config.ts

import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, PreloadAllModules, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Importa el cliente HTTP
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes'; // Asume que tienes un archivo de rutas (app.routes.ts)

// Registrar locale español
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Necesario para la navegación entre tus componentes (.component.ts)
    // 🚀 Con estrategia de precarga para cargar módulos en background
    provideRouter(
      routes,
      withPreloading(PreloadAllModules) // Precarga módulos después del inicial
    ), 
    
    // 2. Fundamental para hacer peticiones GET/POST/etc. a tu backend (Laravel)
    provideHttpClient(withInterceptors([authInterceptor])),
    
    // 3. Configurar locale español
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};