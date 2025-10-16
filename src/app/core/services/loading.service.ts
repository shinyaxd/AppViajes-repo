// ==========================================================
// SERVICIO DE LOADING GLOBAL
// ==========================================================
// Servicio centralizado para controlar el estado de carga (spinner)
// en toda la aplicación usando Signals de Angular 19.

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // Signals para estado de carga reactivo
  private _isLoading = signal<boolean>(false);
  private _loadingMessage = signal<string>('Cargando...');

  // Exponer como readonly
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly loadingMessage = this._loadingMessage.asReadonly();

  /**
   * Muestra el spinner con un mensaje personalizado
   * @param message Mensaje a mostrar (default: "Cargando...")
   */
  show(message: string = 'Cargando...'): void {
    this._loadingMessage.set(message);
    this._isLoading.set(true);
  }

  /**
   * Oculta el spinner
   */
  hide(): void {
    this._isLoading.set(false);
    this._loadingMessage.set('Cargando...');
  }

  /**
   * Verifica si el spinner está visible
   */
  get loading(): boolean {
    return this._isLoading();
  }
}
