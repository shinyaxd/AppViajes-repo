/**
 * Utilidades para manejo de imágenes
 * Centraliza la lógica de obtención de imágenes con fallbacks
 */

// Interfaz para el nuevo formato de objeto de imagen
export interface ImageObject {
  url: string;
  alt?: string | null;
}

export class ImageUtils {
  /**
   * Obtiene la URL de imagen principal con fallback
   * @param primary Imagen principal
   * @param gallery Array de imágenes de galería
   * @param tipo Tipo de servicio para placeholder específico
   */
  static getImageUrl(
    primary: string | undefined | null,
    gallery: Array<ImageObject | string> | undefined | null,
    tipo: 'hotel' | 'tour' | 'generic' = 'generic'
  ): string {
    // 1. Intentar usar imagen principal
    if (this.isValidImageUrl(primary)) {
      return primary;
    }

    // 2. Intentar usar primera imagen de galería
    if (gallery && Array.isArray(gallery) && gallery.length > 0) {
      // Soportar elementos que pueden ser string o ImageObject
      for (const img of gallery) {
        const url = typeof img === 'string' ? img : img?.url;
        if (this.isValidImageUrl(url)) {
          return url as string;
        }
      }
    }

    // 3. Retornar placeholder según tipo
    return this.getPlaceholder(tipo);
  }

  /**
   * Obtiene todas las imágenes disponibles (principal + galería)
   * @param primary Imagen principal
   * @param gallery Array de imágenes de galería
   */
  static getAllImages(
    primary: string | undefined | null,
    gallery: Array<ImageObject | string> | undefined | null
  ): string[] {
    const images: string[] = [];

    // 1. Agregar imagen principal si existe
    if (this.isValidImageUrl(primary)) {
      images.push(primary as string);
    }

    // 2. Agregar URLs de galería si existen (soportando strings u objetos)
    if (gallery && Array.isArray(gallery)) {
      const galleryUrls = gallery
        .map(img => (typeof img === 'string' ? img : img?.url))
        .filter(url => this.isValidImageUrl(url));

      images.push(...galleryUrls as string[]);
    }

    // 3. Remover duplicados manteniendo orden
    const deduped: string[] = [];
    for (const url of images) {
      if (!deduped.includes(url)) deduped.push(url);
    }

    return deduped;
  }

  /**
   * Completa una galería hasta un número específico de imágenes
   * @param images Array de imágenes existentes
   * @param targetCount Número objetivo de imágenes
   * @param tipo Tipo de servicio para placeholders
   */
  static fillGallery(
    images: string[],
    targetCount: number,
    tipo: 'hotel' | 'tour' | 'generic' = 'generic'
  ): string[] {
    const result = [...images];

    // No duplicar imágenes reales al rellenar. Usar placeholders únicos.
    while (result.length < targetCount) {
      const index = result.length + 1;
      result.push(`${this.getPlaceholder(tipo)}?index=${index}`);
    }

    return result.slice(0, targetCount);
  }

  /**
   * Obtiene el placeholder apropiado según el tipo
   * @param tipo Tipo de servicio
   */
  static getPlaceholder(tipo: 'hotel' | 'tour' | 'generic'): string {
    const placeholders = {
      hotel: 'https://img.freepik.com/premium-photo/abstract-blur-hotel-interior_1124848-65384.jpg?semt=ais_hybrid&w=740&q=80',
      tour: 'https://www.shutterstock.com/image-photo/defocused-background-serene-sunset-airport-600nw-2615336361.jpg',
      generic: 'https://vmc.vet.osu.edu/sites/default/files/styles/hero/public/images/placeholder-1000x600.png.webp?itok=vGGEnlHh'
    };

    return placeholders[tipo] || placeholders.generic;
  }

  /**
   * Valida si una URL de imagen es válida
   * @param url URL a validar
   */
  static isValidImageUrl(url: string | undefined | null): url is string {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return false;
    }

    // Validar que sea una URL válida o ruta relativa
    return trimmed.startsWith('http') || 
           trimmed.startsWith('/') || 
           trimmed.startsWith('assets/') ||
           trimmed.startsWith('./');
  }

  /**
   * Maneja el error de carga de imagen
   * @param event Evento de error
   * @param tipo Tipo de servicio para placeholder
   */
  static handleImageError(
    event: Event,
    tipo: 'hotel' | 'tour' | 'generic' = 'generic'
  ): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.getPlaceholder(tipo)) {
      target.src = this.getPlaceholder(tipo);
    }
  }
}
