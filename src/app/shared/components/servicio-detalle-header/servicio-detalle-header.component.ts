import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface ServicioDetalleData {
  nombre: string;
  ciudad: string;
  pais: string;
  direccion?: string;
  estrellas?: number;
  rating?: number;
  resenas?: number; // Cantidad de reseñas (sin ñ para evitar problemas de encoding)
  calificacion_texto?: string; // "Excelente", "Muy bueno", etc.
  precio: number | null;
  descripcion: string;
  duracion?: string; // Solo para tours: "10 Horas"
  galeria_imagenes: string[];
}

@Component({
  selector: 'app-servicio-detalle-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './servicio-detalle-header.component.html',
  styleUrls: ['./servicio-detalle-header.component.css']
})
export class ServicioDetalleHeaderComponent {
  @Input() tipo: 'hotel' | 'tour' = 'hotel';
  @Input() servicio!: ServicioDetalleData;
  @Input() breadcrumb: string[] = []; // Ej: ['Lima', 'Perú', 'Hotel B']
  @Output() onReservar = new EventEmitter<void>();

  /**
   * Obtiene el set completo de 5 imágenes para el grid
   * Si faltan imágenes, completa con placeholders específicos por tipo
   */
  get imagenesParaGrid(): string[] {
    const imagenesOriginales = this.servicio?.galeria_imagenes || [];
    const imagenesCompletas: string[] = [];
    
    // Placeholder base según tipo de servicio
    const placeholderBase = this.tipo === 'hotel' 
      ? 'https://via.placeholder.com/800x600/83c4a6/ffffff?text=Hotel+Image'
      : 'https://via.placeholder.com/800x600/83c4a6/ffffff?text=Tour+Image';

    // Si hay al menos 1 imagen, úsala como base
    if (imagenesOriginales.length > 0) {
      imagenesCompletas.push(...imagenesOriginales);
    }

    // Completar hasta 5 imágenes con placeholders variados
    while (imagenesCompletas.length < 5) {
      const index = imagenesCompletas.length + 1;
      // Usar la primera imagen si existe, sino placeholder
      if (imagenesOriginales.length > 0 && imagenesCompletas.length > 0) {
        // Reutilizar la primera imagen
        imagenesCompletas.push(imagenesOriginales[0]);
      } else {
        imagenesCompletas.push(`${placeholderBase}+${index}`);
      }
    }

    return imagenesCompletas.slice(0, 5); // Máximo 5 imágenes
  }

  get imagenPrincipal(): string {
    return this.imagenesParaGrid[0];
  }

  get imagenesSecundarias(): string[] {
    return this.imagenesParaGrid.slice(1, 5); // Imágenes 2, 3, 4, 5
  }

  get tituloSeccion(): string {
    return this.tipo === 'hotel' ? 'Resumen' : 'Visión General';
  }

  reservar(): void {
    this.onReservar.emit();
  }

  repetirEstrellas(cantidad: number): string {
    return '⭐'.repeat(cantidad || 0);
  }
}
