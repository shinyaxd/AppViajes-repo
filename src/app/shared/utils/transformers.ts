import { HotelData } from '../models/hotel.model';
import { TourData } from '../models/tour.model';
import { ResultadoItem } from '../components/resultados-lista/resultados-lista.component';
import { ImageUtils } from './image.utils';

/**
 * Transformadores de datos para convertir modelos de dominio a DTOs de UI
 * Centraliza la lógica de transformación usada en componentes de resultados
 */
export class ServicioTransformers {
  
  /**
   * Transforma HotelData a ResultadoItem
   * @param hotel Datos del hotel desde la API
   */
  static hotelToResultadoItem(hotel: HotelData): ResultadoItem {
    return {
      id: hotel.id,
      nombre: hotel.nombre,
      imagen_url: ImageUtils.getImageUrl(
        hotel.imagen_url,
        hotel.imagenes,
        'hotel'
      ),
      ubicacion: `${hotel.ciudad}, ${hotel.pais}`,
      rating: this.getDefaultRating('hotel'),
      ratingTexto: this.getRatingText(this.getDefaultRating('hotel')),
      resenias: this.generateReviewCount('hotel'),
      precio: hotel.precio_por_noche || 0,
      precioUnidad: 'noche',
      estrellas: hotel.estrellas
    };
  }

  /**
   * Transforma TourData a ResultadoItem
   * @param tour Datos del tour desde la API
   */
  static tourToResultadoItem(tour: any): ResultadoItem {
    // Extraer datos del tour (puede venir en diferentes formatos)
    const tourData = tour.tour || {};
    
    return {
      id: tour.id,
      nombre: tour.nombre,
      imagen_url: ImageUtils.getImageUrl(
        tour.imagen_url,
        tour.imagenes,
        'tour'
      ),
      ubicacion: `${tour.ciudad}, ${tour.pais}`,
      rating: this.getDefaultRating('tour'),
      ratingTexto: tourData.categoria === 'Aventura' ? 'Excelente' : 'Muy bueno',
      categoria: tourData.categoria || '',
      resenias: this.generateReviewCount('tour'),
      precio: parseFloat(tourData.precio || '0'),
      precioUnidad: 'persona',
      duracionHoras: tourData.duracion 
        ? Math.round(tourData.duracion / 60) 
        : 0
    };
  }

  /**
   * Transforma array de hoteles a array de ResultadoItem
   * @param hoteles Array de hoteles
   */
  static hotelesToResultados(hoteles: HotelData[]): ResultadoItem[] {
    return hoteles.map(hotel => this.hotelToResultadoItem(hotel));
  }

  /**
   * Transforma array de tours a array de ResultadoItem
   * @param tours Array de tours
   */
  static toursToResultados(tours: any[]): ResultadoItem[] {
    return tours.map(tour => this.tourToResultadoItem(tour));
  }

  /**
   * Obtiene el rating por defecto según el tipo
   * TODO: Reemplazar con datos reales del backend cuando estén disponibles
   * @param tipo Tipo de servicio
   */
  private static getDefaultRating(tipo: 'hotel' | 'tour'): number {
    return tipo === 'hotel' ? 4.4 : 4.5;
  }

  /**
   * Genera un número simulado de reseñas
   * TODO: Reemplazar con datos reales del backend cuando estén disponibles
   * @param tipo Tipo de servicio
   */
  private static generateReviewCount(tipo: 'hotel' | 'tour'): number {
    const max = tipo === 'hotel' ? 100 : 50;
    const min = 10;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Obtiene el texto descriptivo del rating
   * @param rating Valor numérico del rating
   */
  private static getRatingText(rating: number): string {
    if (rating >= 4.5) return 'Excelente';
    if (rating >= 4.0) return 'Muy bueno';
    if (rating >= 3.5) return 'Bueno';
    if (rating >= 3.0) return 'Aceptable';
    return 'Regular';
  }
}
