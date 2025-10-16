import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface CardListItem {
  id: number;
  nombre: string;
  ciudad: string;
  pais: string;
  imagen_url?: string;
  galeria_imagenes?: string[];
}

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './card-list.component.html',
  styleUrls: ['./card-list.component.css']
})
export class CardListComponent {
  @Input() title: string = '';
  @Input() items: CardListItem[] = [];
  @Input() routePrefix: string = ''; // '/hoteles/detalle' o '/tour/detalle'
  @Input() errorMessage: string | null = null;

  /**
   * Obtiene la imagen principal del item
   */
  getImageUrl(item: CardListItem): string | null {
    if (item.galeria_imagenes && item.galeria_imagenes.length > 0) {
      return item.galeria_imagenes[0];
    }
    return item.imagen_url || null;
  }
}
