/**
 * Utilidades para manejo de fechas
 * Centraliza la lógica de fechas usada en buscador, detalles y pagos
 */
export class DateUtils {
  /**
   * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
   */
  static getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha de mañana en formato ISO (YYYY-MM-DD)
   */
  static getTomorrowISO(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * Obtiene una fecha X días en el futuro
   * @param days Número de días a sumar (puede ser negativo)
   */
  static getDatePlusDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Valida que una fecha sea válida
   * @param dateString Fecha en formato string
   */
  static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Calcula el número de noches entre dos fechas
   * @param checkIn Fecha de entrada (YYYY-MM-DD)
   * @param checkOut Fecha de salida (YYYY-MM-DD)
   * @returns Número de noches (0 si las fechas son inválidas)
   */
  static calculateNights(checkIn: string, checkOut: string): number {
    if (!this.isValidDate(checkIn) || !this.isValidDate(checkOut)) {
      return 0;
    }

    const dateIn = new Date(checkIn);
    const dateOut = new Date(checkOut);
    const diffMs = dateOut.getTime() - dateIn.getTime();
    
    return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }

  /**
   * Convierte un string de fecha a objeto Date validado
   * @param dateString Fecha en formato string
   * @returns Date object o null si la fecha es inválida
   */
  static parseDate(dateString: string): Date | null {
    if (!this.isValidDate(dateString)) {
      return null;
    }
    return new Date(dateString);
  }

  /**
   * Obtiene la fecha mínima para check-out basada en check-in
   * @param checkInDate Fecha de check-in (YYYY-MM-DD)
   * @returns Fecha mínima de check-out (día siguiente)
   */
  static getMinCheckoutDate(checkInDate: string): string {
    if (!this.isValidDate(checkInDate)) {
      return this.getTomorrowISO();
    }

    const checkIn = new Date(checkInDate);
    checkIn.setDate(checkIn.getDate() + 1);
    return checkIn.toISOString().split('T')[0];
  }

  /**
   * Formatea una fecha para mostrar (ej: "15 de octubre de 2025")
   * @param dateString Fecha en formato ISO
   * @param locale Locale para formateo (default: 'es-ES')
   */
  static formatDate(dateString: string, locale: string = 'es-ES'): string {
    if (!this.isValidDate(dateString)) {
      return '';
    }

    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
