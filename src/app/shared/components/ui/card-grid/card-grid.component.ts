import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface CardGridItem {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  precio?: number;
  precio_por_noche?: number | null;
  imagen_url?: string;
  galeria_imagenes?: string[];
  categoria?: string;
}

@Component({
  selector: 'app-card-grid',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './card-grid.component.html',
  styleUrls: ['./card-grid.component.css']
})
export class CardGridComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() items: CardGridItem[] = [];
  @Input() showButton: boolean = false; // "See All" button solo para hoteles
  @Input() routePrefix: string = ''; // '/hoteles/detalle' o vacío para tours
  @Input() mode: 'hoteles' | 'tours' = 'hoteles'; // Tipo de grid
  @Input() columns: number = 4; // Número de columnas

  @Output() cardClick = new EventEmitter<CardGridItem>(); // Para tours por categoría
  @Output() buttonClick = new EventEmitter<void>(); // Para "See All"

  /**
   * Obtiene la imagen principal del item
   */
  getImageUrl(item: CardGridItem): string | null {
    if (item.galeria_imagenes && item.galeria_imagenes.length > 0) {
      return item.galeria_imagenes[0];
    }
    return item.imagen_url || null;
  }

  /**
   * Maneja el click en una card
   */
  onCardClick(item: CardGridItem): void {
    this.cardClick.emit(item);
  }

  /**
   * Maneja el click en el botón "See All"
   */
  onButtonClick(): void {
    this.buttonClick.emit();
  }

  /**
   * Obtiene el precio formateado
   */
  getPrice(item: CardGridItem): number {
    return item.precio_por_noche || item.precio || 0;
  }
}
