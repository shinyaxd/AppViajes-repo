import { Injectable, inject } from '@angular/core';
// 🚨 CAMBIO: HttpHeaders ya no es necesario para la autorización, solo para 'Accept'
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; 
import { Observable, forkJoin, map, catchError, throwError, switchMap } from 'rxjs'; 
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service'; 

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED (Se mantienen)
// ==========================================================
import {
  Habitacion,
  HabitacionCreatePayload,
  HotelData,
  ServiceData,
  HotelDetalles,
  HotelListApiRespuesta,
  SupplierHotelListApiRespuesta,
  HotelCreatePayload,
  HotelCreateResponse
} from '../../../shared/models';

// Re-exportamos las interfaces para mantener backward compatibility
export type {
  Habitacion,
  HabitacionCreatePayload,
  HotelData,
  ServiceData,
  HotelDetalles,
  HotelListApiRespuesta,
  SupplierHotelListApiRespuesta,
  HotelCreatePayload,
  HotelCreateResponse
};

// ==========================================================
// 2. SERVICIO PRINCIPAL
// ==========================================================
@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private http = inject(HttpClient);
  // Mantemos la inyección de AuthService por si se usa isLoggedIn() o datos de usuario
  private auth = inject(AuthService); 
  private readonly API_URL = environment.apiUrl;

  /**
   * 🚨 CAMBIO CRÍTICO: Simplificamos getHeaders(). 
   * Ya NO incluye 'Authorization: Bearer'. 
   * El Interceptor se encarga de la autenticación vía Cookies/CSRF.
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json' 
      // Se ELIMINA: (token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }
  
  // ==========================================================
  // 3. MÉTODOS
  // ==========================================================
  
  /**
   * NUEVO: Crea una o varias habitaciones para un servicio de hotel dado.
   */
  createHabitaciones(servicioId: number, habitaciones: HabitacionCreatePayload[]): Observable<any> {
    
    const creationRequests = habitaciones.map(habitacion => {
      const endpoint = `${this.API_URL}/hoteles/${servicioId}/habitaciones`; 
      
      // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos por consistencia
      return this.http.post(endpoint, habitacion, { headers: this.getHeaders() });
    });

    return forkJoin(creationRequests).pipe(
      catchError(error => {
        console.error('Error al crear una o más habitaciones (petición individual falló):', error);
        return throwError(() => new Error('Error al registrar las habitaciones. Revise la consola.'));
      })
    );
  }

  /**
   * NUEVO: Crea el servicio (Hotel) y luego las habitaciones en una sola secuencia.
   */
  createHotelWithHabitaciones(payload: { 
    hotel: HotelCreatePayload, 
    habitaciones: Array<Omit<HabitacionCreatePayload, 'servicio_id'>> 
  }): Observable<any> {
      
      // 1. Crear el Servicio y Hotel (POST /api/hoteles)
      // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos
      return this.http.post<HotelCreateResponse>(`${this.API_URL}/hoteles`, payload.hotel, { headers: this.getHeaders() }).pipe(
          
          // 2. Usar switchMap para tomar el ID del hotel creado y crear las habitaciones
          switchMap(hotelResponse => {
              const servicioId = hotelResponse.data?.servicio?.id;

              if (!servicioId) {
                  return throwError(() => new Error('El servidor no retornó el ID del hotel creado.'));
              }

              const habitacionesPayload: HabitacionCreatePayload[] = payload.habitaciones.map(h => ({
                  ...h,
                  servicio_id: servicioId, 
              }));

              // 3. Devolver la Observable de la creación de habitaciones 
              return this.createHabitaciones(servicioId, habitacionesPayload);
          }),
          catchError(error => {
              console.error('Error en el flujo de creación Hotel + Habitaciones:', error);
              return throwError(() => new Error('Fallo al completar la publicación del hotel y sus habitaciones. Revise su rol y los logs del backend.'));
          })
      );
  }

  /**
   * NUEVO: Obtiene la lista de hoteles Pertenecientes al proveedor autenticado.
   */
  getSupplierHotels(): Observable<HotelData[]> {
    const endpoint = `${this.API_URL}/proveedor/servicios`; 

    return this.http
      .get<SupplierHotelListApiRespuesta>(endpoint, {
        // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos
        headers: this.getHeaders(), 
      })
      .pipe(
        map(res =>
          res.data.map(apiHotel => ({
            id: apiHotel.id, 
            nombre: apiHotel.nombre,
            ciudad: apiHotel.ciudad,
            pais: apiHotel.pais,
            direccion: apiHotel.direccion,
            estrellas: apiHotel.estrellas,
            imagen_url: apiHotel.imagen_url || 'assets/images/placeholder-hotel.jpg',
            galeria_imagenes: apiHotel.galeria_imagenes ?? [],
            precio_por_noche: apiHotel.precio_por_noche ?? null,
            descripcion: apiHotel.descripcion ?? null,
            reservations: apiHotel.reservas_pendientes ?? 0, 
          }) as HotelData)
        ),
        catchError((error) => {
            console.error('Error al cargar hoteles del proveedor:', error);
            return throwError(() => new Error('No se pudieron cargar sus hoteles. Verifique su autenticación.'));
        })
      );
  }
  /**
   * NUEVO: Obtiene la lista de servicios Pertenecientes al proveedor autenticado.
   */
  getSupplierServices(): Observable<ServiceData[]> {
    const endpoint = `${this.API_URL}/proveedor/servicios`;

    return this.http.get<{ data: any[] }>(endpoint, {
      headers: this.getHeaders(),
    }).pipe(
      map(res => res.data.map(item => ({
        id: item.id,
        tipo: item.tipo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        ciudad: item.ciudad,
        pais: item.pais,
        imagen_url: item.imagen_url || 'assets/images/placeholder.jpg',
        activo: item.activo,
        created_at: item.created_at,
        meta_tipo: item.meta_tipo
      }) as ServiceData)),
      catchError((error) => {
        console.error('Error al cargar servicios del proveedor:', error);
        return throwError(() => new Error('No se pudieron cargar los servicios.'));
      })
    );
  }

  /**
   * NUEVO: Método para eliminar un hotel por su ID de servicio.
   */
  deleteHotel(servicioId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/servicios/${servicioId}`, {
        // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos
        headers: this.getHeaders()
    }).pipe(
        catchError(error => {
            console.error(`Error al eliminar servicio ${servicioId}:`, error);
            return throwError(() => new Error(`Fallo al eliminar el servicio.`));
        })
    );
  }

  /**
   * Obtener lista de hoteles (solo datos generales)
   */
  getHoteles(params?: Record<string, any>): Observable<HotelData[]> {
    const httpParams = new HttpParams({ fromObject: params || {} });

    return this.http
      .get<HotelListApiRespuesta>(`${this.API_URL}/hoteles`, {
        // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos
        headers: this.getHeaders(), 
        params: httpParams
      })
      .pipe(
        map(res =>
          res.data.map(apiHotel => ({
            id: apiHotel.id,
            nombre: apiHotel.nombre,
            ciudad: apiHotel.ciudad,
            pais: apiHotel.pais,
            direccion: apiHotel.direccion,
            estrellas: apiHotel.estrellas,
            imagen_url: apiHotel.imagenUrl?.[0] || 'assets/images/placeholder-hotel.jpg',
            galeria_imagenes: apiHotel.imagenUrl ?? [],
            precio_por_noche: apiHotel.precio_por_noche ?? null,
            descripcion: apiHotel.descripcion ?? null,
            reservations: 0, 
          }))
        )
      );
  }

  /**
   * Obtener los detalles de un hotel específico (habitaciones)
   */
  getHotelDetalles(id: number): Observable<HotelDetalles> {
    return this.http
      .get<any>(`${this.API_URL}/hoteles/${id}`, {
        // 🚨 CAMBIO: getHeaders() ya no tiene token, pero lo enviamos
        headers: this.getHeaders()
      })
      .pipe(
        map(res => {
          const h = res.hotel ?? res.data ?? res;
          if (!h) {
            throw new Error('Formato de respuesta inesperado al obtener detalles del hotel.');
          }

          const hotel: HotelData = {
            id: h.servicio_id ?? h.id,
            nombre: h.nombre,
            ciudad: h.ciudad,
            pais: h.pais,
            direccion: h.direccion,
            estrellas: h.estrellas,
            imagen_url: h.imagen_url || 'assets/images/placeholder-hotel.jpg',
            galeria_imagenes: (h.imagenes ?? []).map((img: any) => img.url).filter((url: string) => !!url),
            precio_por_noche: h.precio_por_noche ?? null,
            descripcion: h.descripcion ?? null,
            reservations: 0
          };

          const habitaciones: Habitacion[] = (h.habitaciones ?? res.habitaciones ?? []).map((r: any) => ({
            id: r.id,
            nombre: r.nombre ?? '',
            capacidad_adultos: r.capacidad_adultos,
            capacidad_ninos: r.capacidad_ninos,
            cantidad: r.cantidad ?? r.unidades_disponibles ?? 0,
            precio_por_noche: r.precio_por_noche,
            descripcion: r.descripcion ?? ''
          }));

          return { hotel, habitaciones };
        })
      );
  }

  /**
   * Combina la información general y los detalles del hotel
   */
  getHotelCompleto(id: number): Observable<HotelDetalles> {
    return forkJoin({
      lista: this.getHoteles(),
      detalle: this.getHotelDetalles(id)
    }).pipe(
      map(({ lista, detalle }) => {
        const hotelLista = lista.find(h => h.id === id);

        if (hotelLista) {
          detalle.hotel = {
            ...detalle.hotel,
            ...hotelLista 
          };
        }

        return detalle;
      })
    );
  }
}