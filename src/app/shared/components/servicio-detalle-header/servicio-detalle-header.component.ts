import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ImageUtils } from '../../utils/image.utils';

export interface ServicioDetalleData {
  nombre: string;
  ciudad: string;
  pais: string;
  direccion?: string;
  estrellas?: number;
  rating?: number;
  resenas?: number; // Cantidad de reseñas (sin ñ para evitar problemas de encoding)
  calificacion_texto?: string; // "Excelente", "Muy bueno", etc.
  categoria?: string; // Para tours: e.g. "Aventura", "Cultural"
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
  @Output() onBack = new EventEmitter<void>();

  /**
   * Obtiene el set completo de 5 imágenes para el grid
   * Si faltan imágenes, completa con placeholders específicos por tipo
   * ACTUALIZADO: Usa ImageUtils centralizado
   */
  get imagenesParaGrid(): string[] {
    const imagenesOriginales = this.servicio?.galeria_imagenes || [];
    const tipoImagen = this.tipo === 'hotel' ? 'hotel' : 'tour';
    
    // Usar ImageUtils para completar la galería hasta 5 imágenes
    return ImageUtils.fillGallery(imagenesOriginales, 5, tipoImagen);
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

  // Visor / modal de imágenes (solo reimplementado)
  viewerOpen = false;
  currentIndex = 0;

  openViewer(index: number): void {
    this.currentIndex = index;
    this.viewerOpen = true;
    // prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeViewer(): void {
    this.viewerOpen = false;
    document.body.style.overflow = '';
  }

  nextImage(): void {
    const length = this.imagenesParaGrid.length;
    this.currentIndex = (this.currentIndex + 1) % length;
  }

  prevImage(): void {
    const length = this.imagenesParaGrid.length;
    this.currentIndex = (this.currentIndex - 1 + length) % length;
  }

  get currentImage(): string {
    return this.imagenesParaGrid[this.currentIndex];
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.viewerOpen) return;
    if (event.key === 'Escape') this.closeViewer();
    if (event.key === 'ArrowRight') this.nextImage();
    if (event.key === 'ArrowLeft') this.prevImage();
  }

  repetirEstrellas(cantidad: number): string {
    return '⭐'.repeat(cantidad || 0);
  }

  volverClicked(): void {
    // Emitir el evento para que el componente padre controle la navegación.
    this.onBack.emit();
  }
}
