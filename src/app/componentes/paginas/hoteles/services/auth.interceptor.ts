// src/app/interceptors/auth.interceptor.ts

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // 🔑 CORRECCIÓN: Usamos el prefijo que el frontend está enviando.
  // Esto asegura que el token se adjunte a las peticiones que van a ser interceptadas por el proxy.
  private apiPrefix = '/api'; 

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    const token = this.authService.getToken();

    // 1. Verificamos si hay token Y si la URL comienza con nuestro prefijo de API.
    if (token && request.url.startsWith(this.apiPrefix)) { 
      
      // Clonamos la solicitud y le inyectamos el encabezado de autorización
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}` 
        }
      });
      // Continuamos con la solicitud que ahora tiene el token
      return next.handle(authReq);
    }

    // Si no es una llamada a la API o no hay token (ej. la llamada de login), 
    // continuamos con la solicitud original sin modificar.
    return next.handle(request);
  }
}