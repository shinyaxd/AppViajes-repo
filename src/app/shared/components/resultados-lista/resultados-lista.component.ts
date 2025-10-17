import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Interfaz genérica para items de resultados
 * Soporta tanto hoteles como tours
 */
export interface ResultadoItem {
  id: number;
  nombre: string;
  imagen_url: string;
  ubicacion: string; // "Ciudad, País"
  rating: number; // Calificación numérica
  ratingTexto: string; // "Muy bueno", "Excelente"
  resenias: number; // Número de reseñas
  precio: number;
  precioUnidad: string; // "noche" o "persona"
  // Campos específicos
  estrellas?: number; // Solo hoteles
  duracionHoras?: number; // Solo tours
}

@Component({
  selector: 'app-resultados-lista',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resultados-lista.component.html',
  styleUrls: ['./resultados-lista.component.css']
})
export class ResultadosListaComponent {
  @Input() tipo: 'hoteles' | 'tours' = 'hoteles';
  @Input() items: ResultadoItem[] = [];
  @Input() totalItems: number = 0;
  @Input() mostrarMas: boolean = false; // Si hay más resultados para cargar

  @Output() verMasClick = new EventEmitter<void>();
  @Output() verDetalleClick = new EventEmitter<ResultadoItem>();

  /**
   * Emite evento cuando se hace click en "Ver detalles"
   */
  onVerDetalleClick(item: ResultadoItem): void {
    this.verDetalleClick.emit(item);
  }

  /**
   * Emite evento cuando se hace click en "Ver más resultados"
   */
  onVerMasClick(): void {
    this.verMasClick.emit();
  }

  /**
   * Genera la ruta de detalle según el tipo
   */
  getDetalleRoute(item: ResultadoItem): string {
    return this.tipo === 'hoteles' 
      ? `/hoteles/detalle/${item.id}` 
      : `/tour/detalle/${item.id}`; // ✅ Corregido: /tour/ (singular)
  }

  /**
   * Maneja el error de carga de imagen
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/placeholder.jpg';
  }
}
