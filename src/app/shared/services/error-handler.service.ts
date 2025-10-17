import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Tipos de error comunes
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Estructura de error procesado
 */
export interface ProcessedError {
  type: ErrorType;
  message: string;
  technicalMessage?: string;
  statusCode?: number;
}

/**
 * Servicio centralizado para manejo de errores HTTP
 * Proporciona mensajes consistentes y logging estructurado
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  /**
   * Procesa un error HTTP y retorna un mensaje amigable
   * @param error Error HTTP de Angular
   * @param context Contexto de la operación (ej: 'Cargar hoteles')
   */
  handleHttpError(error: HttpErrorResponse, context: string = 'Operación'): ProcessedError {
    const processedError = this.processError(error, context);
    
    // Log técnico para debugging
    this.logError(processedError, context, error);
    
    return processedError;
  }

  /**
   * Procesa el error y determina el tipo y mensaje
   */
  private processError(error: HttpErrorResponse, context: string): ProcessedError {
    // Error de red (sin conexión al servidor)
    if (error.status === 0) {
      return {
        type: ErrorType.NETWORK,
        message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
        statusCode: 0
      };
    }

    // Error 401 - No autenticado
    if (error.status === 401) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        technicalMessage: error.error?.message,
        statusCode: 401
      };
    }

    // Error 403 - Sin permisos
    if (error.status === 403) {
      return {
        type: ErrorType.AUTHORIZATION,
        message: error.error?.message || 'No tienes permisos para realizar esta acción.',
        technicalMessage: error.error?.message,
        statusCode: 403
      };
    }

    // Error 404 - No encontrado
    if (error.status === 404) {
      return {
        type: ErrorType.NOT_FOUND,
        message: `${context} no encontrado.`,
        technicalMessage: error.error?.message,
        statusCode: 404
      };
    }

    // Error 422 - Validación
    if (error.status === 422) {
      const validationMessage = this.extractValidationMessage(error);
      return {
        type: ErrorType.VALIDATION,
        message: validationMessage || `Error en los datos de ${context}.`,
        technicalMessage: error.error?.message,
        statusCode: 422
      };
    }

    // Error 500+ - Error del servidor
    if (error.status >= 500) {
      return {
        type: ErrorType.SERVER,
        message: 'El servidor encontró un error. Por favor, intenta más tarde.',
        technicalMessage: error.error?.message,
        statusCode: error.status
      };
    }

    // Otros errores
    return {
      type: ErrorType.UNKNOWN,
      message: error.error?.message || `Error al realizar ${context}.`,
      technicalMessage: error.message,
      statusCode: error.status
    };
  }

  /**
   * Extrae mensaje de validación de errores 422
   */
  private extractValidationMessage(error: HttpErrorResponse): string | null {
    if (error.error?.message) {
      return error.error.message;
    }

    // Laravel devuelve errores de validación en error.errors
    if (error.error?.errors) {
      const errors = error.error.errors;
      const firstKey = Object.keys(errors)[0];
      if (firstKey && Array.isArray(errors[firstKey])) {
        return errors[firstKey][0];
      }
    }

    return null;
  }

  /**
   * Log estructurado del error
   */
  private logError(processedError: ProcessedError, context: string, originalError: HttpErrorResponse): void {
    const logLevel = this.getLogLevel(processedError.type);
    
    console[logLevel](`[${processedError.type}] ${context}:`, {
      userMessage: processedError.message,
      technicalMessage: processedError.technicalMessage,
      statusCode: processedError.statusCode,
      url: originalError.url,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Determina el nivel de log según el tipo de error
   */
  private getLogLevel(errorType: ErrorType): 'error' | 'warn' | 'info' {
    switch (errorType) {
      case ErrorType.SERVER:
      case ErrorType.UNKNOWN:
        return 'error';
      case ErrorType.NETWORK:
      case ErrorType.AUTHENTICATION:
        return 'warn';
      default:
        return 'info';
    }
  }

  /**
   * Obtiene solo el mensaje de usuario (helper para uso rápido)
   */
  getUserMessage(error: HttpErrorResponse, context: string = 'Operación'): string {
    return this.handleHttpError(error, context).message;
  }
}
