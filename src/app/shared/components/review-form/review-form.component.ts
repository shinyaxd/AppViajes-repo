import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Review, ReviewCreate } from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';

/**
 * Componente de formulario para crear/editar reseñas
 * Muestra el textarea, selector de estrellas y botones de acción
 */
@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.css']
})
export class ReviewFormComponent {
  private reviewsService = inject(ReviewsService);

  @Input() servicioId!: number;
  @Input() servicioTipo: 'hotel' | 'tour' = 'hotel';
  @Output() onSubmit = new EventEmitter<Review>();
  @Output() onCancel = new EventEmitter<void>();

  // Datos del formulario
  calificacion = 0; // 0 = sin seleccionar, 1-5 = seleccionado
  comentario = '';
  
  // Estados
  submitting = false;
  error = false;
  errorMessage = '';

  // Constantes
  readonly MAX_CARACTERES = 300;
  readonly MIN_CARACTERES = 10;

  /**
   * Seleccionar calificación (estrellas)
   */
  seleccionarCalificacion(rating: number): void {
    this.calificacion = rating;
  }

  /**
   * Hover sobre estrellas (para preview)
   */
  hoverCalificacion = 0;

  onMouseEnter(rating: number): void {
    this.hoverCalificacion = rating;
  }

  onMouseLeave(): void {
    this.hoverCalificacion = 0;
  }

  /**
   * Obtener el número de estrellas a mostrar (considerando hover)
   */
  get estrellasAMostrar(): number {
    return this.hoverCalificacion || this.calificacion;
  }

  /**
   * Validar si el formulario es válido
   */
  get isValid(): boolean {
    return (
      this.calificacion > 0 &&
      this.comentario.trim().length >= this.MIN_CARACTERES &&
      this.comentario.trim().length <= this.MAX_CARACTERES
    );
  }

  /**
   * Caracteres restantes
   */
  get caracteresRestantes(): number {
    return this.MAX_CARACTERES - this.comentario.length;
  }

  /**
   * Color del contador según caracteres restantes
   */
  get contadorColor(): string {
    const restantes = this.caracteresRestantes;
    if (restantes < 0) return '#ef4444'; // Rojo si excede
    if (restantes < 50) return '#f59e0b'; // Naranja si queda poco
    return '#6b7280'; // Gris normal
  }

  /**
   * Enviar formulario
   */
  enviarReview(): void {
    if (!this.isValid || this.submitting) {
      return;
    }

    this.submitting = true;
    this.error = false;

    const reviewData: ReviewCreate = {
      servicio_id: this.servicioId,
      calificacion: this.calificacion,
      comentario: this.comentario.trim()
    };

    this.reviewsService.createReview(reviewData).subscribe({
      next: (review: Review) => {
        console.log('✅ Reseña creada exitosamente:', review);
        this.submitting = false;
        this.onSubmit.emit(review);
        this.resetForm();
      },
      error: (error: Error) => {
        console.error('❌ Error al crear reseña:', error);
        this.error = true;
        this.errorMessage = error.message || 'No se pudo enviar tu reseña. Intenta nuevamente.';
        this.submitting = false;
      }
    });
  }

  /**
   * Cancelar y cerrar formulario
   */
  cancelar(): void {
    this.onCancel.emit();
    this.resetForm();
  }

  /**
   * Resetear formulario
   */
  private resetForm(): void {
    this.calificacion = 0;
    this.comentario = '';
    this.error = false;
    this.errorMessage = '';
    this.hoverCalificacion = 0;
  }

  /**
   * Generar array para las estrellas (1-5)
   */
  get estrellasArray(): number[] {
    return [1, 2, 3, 4, 5];
  }
}
