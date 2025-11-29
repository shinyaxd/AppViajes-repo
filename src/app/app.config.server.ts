import { mergeApplicationConfig, ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// Registrar locale español para SSR
registerLocaleData(localeEs);

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
