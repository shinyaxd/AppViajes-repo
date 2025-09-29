import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// ----------------------------------------------------
// --- 1. INTERFACES DE DATOS ---
// ----------------------------------------------------

// Interfaces Compartidas para filtros y capacidad
export interface CapacidadHotel {
    adultos: number;
    ninos: number;
    habitaciones: number; 
}

export interface DisponibilidadHotel {
    desde: string;
    hasta: string;
}

// Interfaces para HotelesComponent (Listado Básico)
export interface Hotel {
  id: number; 
  nombre: string;
  ubicacion: string; 
  direccion?: string; 
  estrellas_total?: number;
  imagenUrl: string; 
  estrellas: number; 
  precio_por_noche: number;
  etiqueta?: string; 
}

// Interfaces para ResultadosHOTELESComponent (Listado Detallado)
export interface HotelListado {
    id: number;
    tipo: string;
    nombre: string;
    ubicacion: string;
    distrito: string;
    imagenUrl: string[];
    estrellas: number;
    amenidades: string;
    precio_por_noche: number;
    filtros: CapacidadHotel; 
    disponibilidad: DisponibilidadHotel; 
}

// Interfaces para DetallesHotelComponent
export interface Habitacion {
    id: number;
    nombre: string; 
    capacidad_adultos: number;
    capacidad_ninos: number;
    precio_por_noche: number;
    unidades_totales: number;
    unidades_disponibles: number;
    descripcion: string;
    seleccionada?: number; // Usada solo en el componente DetallesHotel
}

export interface HotelData {
    id: number;
    tipo: string;
    nombre: string;
    ubicacion: string;
    distrito: string;
    direccion: string;
    estrellas: number;
    precio_por_noche: number;
    imagenUrl: string[];
    descripcion: string; 
    disponibilidad: DisponibilidadHotel;
    filtros: CapacidadHotel;
    habitaciones: Habitacion[]; 
}

// Interfaces para PagosHotelesComponent (Payload de Reserva)
export interface ReservaItem {
  tipo: string;
  cantidad: number;
  precioNoche: number; 
  precioTotalReserva: number;
}
export interface ReservaHabitacionPayload {
    habitacionId: number;
    cantidad: number;
    precioNoche: number;
}
export interface ReservaPayload {
    hotelId: number;
    cliente: {
        nombre: string;
        email: string;
        telefono: string;
    };
    checkIn: string;
    checkOut: string;
    noches: number;
    precioTotal: number;
    habitaciones: ReservaHabitacionPayload[];
}


// --- 2. INTERFACES DE RESPUESTA DE LA API (para mapeo de 'data') ---

// Respuestas genéricas anidadas
interface HotelApiRespuesta { data: Hotel[]; } 
interface HotelListadoApiRespuesta { data: HotelListado[]; } 
interface HotelDetalleApiRespuesta { data: HotelData; } 

// ----------------------------------------------------

@Injectable({
  providedIn: 'root' 
})
export class HotelService {
  
  // 💡 Define los endpoints de tu API. Usa las URLs reales de tu backend.
  private API_URL = '/public/hoteles-completo.json'; // Simulación de endpoint principal
  private RESERVA_URL = '/api/reservas'; // Endpoint real de backend para POST

  constructor(private http: HttpClient) { }
  
  // ----------------------------------------------------
  // --- MÉTODOS DE BÚSQUEDA Y LISTADO ---
  // ----------------------------------------------------

  /**
   * Obtiene la lista básica de hoteles (usada en el Buscador/Inicio).
   */
  getHoteles(): Observable<Hotel[]> {
    // Nota: Aunque el JSON devuelva más datos, aquí solo devolvemos la interfaz Hotel,
    // asumiendo que un endpoint dedicado devolvería un array más ligero.
    return this.http.get<HotelApiRespuesta>(this.API_URL).pipe(
      map(response => Array.isArray(response.data) ? response.data.map(item => ({
        id: item.id,
        nombre: item.nombre,
        ubicacion: item.ubicacion,
        direccion: item.direccion,
        estrellas: item.estrellas,
        precio_por_noche: item.precio_por_noche,
        imagenUrl: item.imagenUrl[0] // Tomar solo la primera imagen para el listado básico
      })) : [])
    );
  }

  /**
   * Deriva destinos únicos a partir del listado básico de hoteles.
   */
  getDestinos(): Observable<string[]> {
    return this.getHoteles().pipe( 
        map((hoteles: Hotel[]) => {
            const ubicaciones = hoteles.map(hotel => hotel.ubicacion).filter(ubicacion => !!ubicacion);
            return Array.from(new Set(ubicaciones));
        })
    );
  }

  /**
   * Obtiene la lista detallada de hoteles para la página de resultados.
   * Maneja el formato anidado 'data' o un array directo.
   */
  getHotelesListado(): Observable<HotelListado[]> {
    // Usamos el tipado UNION para aceptar la nueva respuesta anidada o la antigua (array directo)
    return this.http.get<HotelListadoApiRespuesta | HotelListado[]>(this.API_URL).pipe( 
      map(response => {
        // Verifica si la propiedad 'data' existe y es un array
        if ('data' in response && Array.isArray(response.data)) {
          // Asumimos que response.data contiene HotelListado[]
          return response.data as HotelListado[]; 
        }
        // Si la respuesta completa es el array (formato antiguo o sin anidar)
        return response as HotelListado[];
      })
    );
  }

  /**
   * Obtiene los detalles completos de un hotel por su ID (usado en DetallesHotelComponent).
   * 🚨 Nota: En un backend real, harías una llamada específica como: `/api/hoteles/${id}`
   * Aquí se simula extrayendo del JSON completo.
   */
  getHotelDetails(id: number): Observable<HotelData> {
    // En un entorno de desarrollo con JSON local, cargamos el archivo completo y filtramos.
    return this.http.get<HotelDetalleApiRespuesta | HotelData[]>(this.API_URL).pipe(
      map((response: any) => {
          const hotelesArray = Array.isArray(response.data) ? response.data : 
                               Array.isArray(response) ? response : [];
          
          const hotelData = hotelesArray.find((h: HotelData) => h.id === id);
          
          if (!hotelData) {
            throw new Error(`Hotel con ID ${id} no encontrado.`);
          }
          return hotelData as HotelData;
      })
    );
  }
  
  // ----------------------------------------------------
  // --- MÉTODOS DE TRANSACCIÓN ---
  // ----------------------------------------------------

  /**
   * Envía los datos de la reserva al backend para su procesamiento y confirmación.
   * @param payload Los datos completos de la reserva y el cliente.
   * @returns Un Observable con la respuesta del backend (ej: un ID de confirmación).
   */
  confirmarReserva(payload: ReservaPayload): Observable<any> {
    console.log('--- ENVIANDO RESERVA A BACKEND ---', payload);
    // 💡 Usa POST para crear un nuevo recurso (la reserva).
    // El backend debería devolver un objeto con el ID de la reserva.
    return this.http.post<any>(this.RESERVA_URL, payload);
  }
}
