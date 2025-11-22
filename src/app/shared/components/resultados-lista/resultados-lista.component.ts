import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface ResultadoItem {
  id: number;
  nombre: string;
  imagen_url: string;
  ubicacion: string;
  rating: number;
  ratingTexto: string;
  resenias: number;
  precio: number;
  precioUnidad: string;
  estrellas?: number;
  duracionHoras?: number;
  categoria?: string;
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
  @Input() mostrarMas: boolean = false;
  
  // Recibe 'true' si el usuario activó el switch
  @Input() itinerarioActivo: boolean = false; 

  @Output() verMasClick = new EventEmitter<void>();
  @Output() verDetalleClick = new EventEmitter<ResultadoItem>();
  
  //Avisa al padre que quieren ver el itinerario
  @Output() verItinerarioClick = new EventEmitter<ResultadoItem>();

  onVerDetalleClick(item: ResultadoItem): void {
    this.verDetalleClick.emit(item);
  }

  // NUEVO MÉTODO PARA EL CLICK DEL BOTÓN
  onVerItinerarioClick(item: ResultadoItem): void {
    this.verItinerarioClick.emit(item);
  }

  onVerMasClick(): void {
    this.verMasClick.emit();
  }

  getDetalleRoute(item: ResultadoItem): string {
    return this.tipo === 'hoteles' 
      ? `/hoteles/detalle/${item.id}` 
      : `/tour/detalle/${item.id}`;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/placeholder.jpg';
  }
}