/**
 * Utilidades para manejo de imágenes
 * Centraliza la lógica de obtención de imágenes con fallbacks
 */
export class ImageUtils {
  /**
   * Obtiene la URL de imagen principal con fallback
   * @param primary Imagen principal
   * @param gallery Array de imágenes de galería
   * @param tipo Tipo de servicio para placeholder específico
   */
  static getImageUrl(
    primary: string | undefined | null,
    gallery: string[] | undefined | null,
    tipo: 'hotel' | 'tour' | 'generic' = 'generic'
  ): string {
    // 1. Intentar usar imagen principal
    if (primary && primary.trim().length > 0) {
      return primary;
    }

    // 2. Intentar usar primera imagen de galería
    if (gallery && Array.isArray(gallery) && gallery.length > 0) {
      const firstImage = gallery[0];
      if (firstImage && firstImage.trim().length > 0) {
        return firstImage;
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
    gallery: string[] | undefined | null
  ): string[] {
    const images: string[] = [];

    // Agregar imagen principal si existe
    if (primary && primary.trim().length > 0) {
      images.push(primary);
    }

    // Agregar galería si existe
    if (gallery && Array.isArray(gallery)) {
      const validGallery = gallery.filter(img => img && img.trim().length > 0);
      images.push(...validGallery);
    }

    // Remover duplicados manteniendo orden
    return [...new Set(images)];
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

    // Si no hay imágenes, agregar al menos un placeholder
    if (result.length === 0) {
      result.push(this.getPlaceholder(tipo));
    }

    // Completar hasta el objetivo reutilizando la primera imagen o placeholders
    while (result.length < targetCount) {
      if (images.length > 0) {
        // Reutilizar la primera imagen real
        result.push(images[0]);
      } else {
        // Agregar placeholder con índice
        const index = result.length + 1;
        result.push(`${this.getPlaceholder(tipo)}?index=${index}`);
      }
    }

    // Limitar al número objetivo
    return result.slice(0, targetCount);
  }

  /**
   * Obtiene el placeholder apropiado según el tipo
   * @param tipo Tipo de servicio
   */
  static getPlaceholder(tipo: 'hotel' | 'tour' | 'generic'): string {
    const placeholders = {
      hotel: 'assets/images/placeholder-hotel.jpg',
      tour: 'assets/images/placeholder-tour.jpg',
      generic: 'assets/images/placeholder.jpg'
    };

    return placeholders[tipo] || placeholders.generic;
  }

  /**
   * Valida si una URL de imagen es válida
   * @param url URL a validar
   */
  static isValidImageUrl(url: string | undefined | null): boolean {
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
