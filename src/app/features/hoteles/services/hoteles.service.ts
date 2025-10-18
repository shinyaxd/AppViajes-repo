import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
// Importamos 'switchMap' para encadenar las llamadas de creación
import { Observable, forkJoin, map, catchError, throwError, switchMap } from 'rxjs'; 
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service'; // 👈 Importa el AuthService dinámico

// ==========================================================
// MODELOS IMPORTADOS DESDE SHARED
// ==========================================================
import {
  Habitacion,
  HabitacionCreatePayload,
  HotelData,
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
  private auth = inject(AuthService); // 👈 Servicio de autenticación
  private readonly API_URL = environment.apiUrl;

  /**
   * ✅ Obtiene headers dinámicamente (usa el token actual del usuario)
   */
  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // solo si hay token
    });
  }

  // ==========================================================
  // 3. MÉTODOS
  // ==========================================================
  
  /**
   * NUEVO: Crea una o varias habitaciones para un servicio de hotel dado.
   * [FIX CRÍTICO]: Envía una petición POST individual por cada habitación,
   * y usa la ruta anidada correcta: /api/hoteles/{servicio_id}/habitaciones.
   * * @param servicioId El ID del servicio/hotel al que pertenecen las habitaciones.
   * @param habitaciones Un array de habitaciones, cada una con el servicio_id.
   */
  createHabitaciones(servicioId: number, habitaciones: HabitacionCreatePayload[]): Observable<any> {
    
    // Mapeamos el array de habitaciones a un array de Observables de creación.
    const creationRequests = habitaciones.map(habitacion => {
      // FIX: Usar la URL correcta que incluye el servicioId: /api/hoteles/{servicio_id}/habitaciones
      const endpoint = `${this.API_URL}/hoteles/${servicioId}/habitaciones`; 
      
      // Enviamos CADA habitación individualmente (que ya incluye el servicio_id en el payload)
      return this.http.post(endpoint, habitacion, { headers: this.getHeaders() });
    });

    // Usamos forkJoin para esperar a que TODAS las peticiones se completen exitosamente.
    return forkJoin(creationRequests).pipe(
      catchError(error => {
        console.error('Error al crear una o más habitaciones (petición individual falló):', error);
        // Devolvemos el error para que sea capturado en el switchMap superior.
        return throwError(() => new Error('Error al registrar las habitaciones. Revise la consola.'));
      })
    );
  }

  /**
   * NUEVO: Crea el servicio (Hotel) y luego las habitaciones en una sola secuencia.
   * Utiliza switchMap para encadenar las peticiones.
   */
  createHotelWithHabitaciones(payload: { 
    hotel: HotelCreatePayload, 
    // Usamos Omit para indicar que el servicio_id no viene del formulario
    habitaciones: Array<Omit<HabitacionCreatePayload, 'servicio_id'>> 
  }): Observable<any> {
      
      // 1. Crear el Servicio y Hotel (POST /api/hoteles)
      return this.http.post<HotelCreateResponse>(`${this.API_URL}/hoteles`, payload.hotel, { headers: this.getHeaders() }).pipe(
          
          // 2. Usar switchMap para tomar el ID del hotel creado y crear las habitaciones
          switchMap(hotelResponse => {
              // Verificación: Asegurarse de que el ID exista
              const servicioId = hotelResponse.data?.servicio?.id;

              if (!servicioId) {
                  return throwError(() => new Error('El servidor no retornó el ID del hotel creado.'));
              }

              // Mapear las habitaciones para incluir el servicio_id
              const habitacionesPayload: HabitacionCreatePayload[] = payload.habitaciones.map(h => ({
                  ...h,
                  servicio_id: servicioId, // Asignar el ID recién creado
              }));

              // 3. Devolver la Observable de la creación de habitaciones 
              // FIX: Pasamos el servicioId como primer argumento para construir la URL correcta.
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
   * Asume un endpoint /api/proveedor/hoteles o similar que filtra por proveedor_id.
   * @returns Observable<HotelData[]> con los campos necesarios para el dashboard.
   */
  getSupplierHotels(): Observable<HotelData[]> {
    // ASUMIMOS este endpoint. Si no existe, pregúntale al backend si /api/hoteles
    // acepta un parámetro para filtrar por el usuario logueado.
    const endpoint = `${this.API_URL}/hoteles/mis-publicaciones`; 

    return this.http
      .get<SupplierHotelListApiRespuesta>(endpoint, {
        headers: this.getHeaders(),
      })
      .pipe(
        map(res =>
          res.data.map(apiHotel => ({
            id: apiHotel.servicio_id, // Usamos servicio_id como ID principal
            nombre: apiHotel.nombre,
            ciudad: apiHotel.ciudad,
            pais: apiHotel.pais,
            direccion: apiHotel.direccion,
            estrellas: apiHotel.estrellas,
            imagen_url: apiHotel.imagen_url || 'assets/images/placeholder-hotel.jpg',
            galeria_imagenes: apiHotel.galeria_imagenes ?? [],
            precio_por_noche: apiHotel.precio_por_noche ?? null,
            descripcion: apiHotel.descripcion ?? null,
            reservations: apiHotel.reservas_pendientes ?? 0, // Campo para el dashboard
          }) as HotelData)
        ),
        catchError((error) => {
            console.error('Error al cargar hoteles del proveedor:', error);
            // Si el error es 403/401, el AuthService ya debería manejar la limpieza.
            return throwError(() => new Error('No se pudieron cargar sus hoteles. Verifique su autenticación.'));
        })
      );
  }

  /**
   * NUEVO: Método para eliminar un hotel por su ID de servicio.
   * Llama a DELETE /api/hoteles/{servicio_id}
   */
  deleteHotel(servicioId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/hoteles/${servicioId}`, {
        headers: this.getHeaders()
    }).pipe(
        catchError(error => {
            console.error(`Error al eliminar hotel ${servicioId}:`, error);
            return throwError(() => new Error(`Fallo al eliminar el hotel.`));
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
            reservations: 0, // Por defecto 0
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
            // ✅ FIX: Backend retorna "imagenes[]" (array de objetos con url), no "galeria_imagenes"
            galeria_imagenes: (h.imagenes ?? []).map((img: any) => img.url).filter((url: string) => !!url),
            precio_por_noche: null,
            descripcion: null,
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
            ...hotelLista,
            ...detalle.hotel // fusiona ambos sin perder campos
          };
        }

        return detalle;
      })
    );
  }
}
