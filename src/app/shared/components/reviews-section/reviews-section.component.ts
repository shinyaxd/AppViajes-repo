import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '../../models/review.model';
import { ReviewsService } from '../../services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewFormComponent } from '../review-form/review-form.component';

/**
 * Componente reutilizable para mostrar la sección de reseñas
 * Muestra el promedio, lista de reseñas y botón "Deja tu opinión"
 * Usado en detalles de hoteles y tours
 */
@Component({
  selector: 'app-reviews-section',
  standalone: true,
  imports: [CommonModule, ReviewFormComponent],
  templateUrl: './reviews-section.component.html',
  styleUrls: ['./reviews-section.component.css']
})
export class ReviewsSectionComponent implements OnInit {
  private reviewsService = inject(ReviewsService);
  private authService = inject(AuthService);

  @Input() servicioId!: number; // ID del servicio (hotel o tour)
  @Input() servicioTipo: 'hotel' | 'tour' = 'hotel'; // Tipo de servicio

  reviews: Review[] = [];
  loading = true;
  error = false;
  errorMessage = '';
  
  // Para el modal del formulario
  mostrarFormulario = false;

  // Estadísticas
  promedioCalificacion = 0;
  textoCalificacion = '';
  totalReviews = 0;

  // Información del usuario actual
  currentUserId: number | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadReviews();
  }

  /**
   * Cargar reseñas del servicio
   */
  loadReviews(): void {
    this.loading = true;
    this.error = false;

    this.reviewsService.getReviewsDataByServicio(this.servicioId).subscribe({
      next: (reviews: Review[]) => {
        this.reviews = reviews;
        this.totalReviews = reviews.length;
        this.promedioCalificacion = this.reviewsService.calcularPromedio(reviews);
        this.textoCalificacion = this.reviewsService.getTextoCalificacion(this.promedioCalificacion);
        this.loading = false;
        console.log(`✅ ${this.totalReviews} reseñas cargadas para servicio ${this.servicioId}`);
      },
      error: (error: Error) => {
        console.error('❌ Error al cargar reseñas:', error);
        this.error = true;
        this.errorMessage = 'No se pudieron cargar las reseñas.';
        this.loading = false;
      }
    });
  }

  /**
   * Abrir modal del formulario de nueva reseña
   */
  abrirFormulario(): void {
    if (!this.authService.isAuthenticated()) {
      alert('Debes iniciar sesión para dejar una reseña.');
      return;
    }
    this.mostrarFormulario = true;
  }

  /**
   * Cerrar modal del formulario
   */
  cerrarFormulario(): void {
    this.mostrarFormulario = false;
  }

  /**
   * Callback cuando se crea una nueva reseña
   */
  onReviewCreated(newReview: Review): void {
    // Agregar la nueva reseña al inicio de la lista
    this.reviews.unshift(newReview);
    this.totalReviews = this.reviews.length;
    this.promedioCalificacion = this.reviewsService.calcularPromedio(this.reviews);
    this.textoCalificacion = this.reviewsService.getTextoCalificacion(this.promedioCalificacion);
    this.cerrarFormulario();
  }

  /**
   * Callback cuando se elimina una reseña
   */
  onReviewDeleted(reviewId: number): void {
    this.reviews = this.reviews.filter(r => r.id !== reviewId);
    this.totalReviews = this.reviews.length;
    this.promedioCalificacion = this.reviewsService.calcularPromedio(this.reviews);
    this.textoCalificacion = this.reviewsService.getTextoCalificacion(this.promedioCalificacion);
  }

  /**
   * Callback cuando se actualiza una reseña
   */
  onReviewUpdated(updatedReview: Review): void {
    const index = this.reviews.findIndex(r => r.id === updatedReview.id);
    if (index !== -1) {
      this.reviews[index] = updatedReview;
      this.promedioCalificacion = this.reviewsService.calcularPromedio(this.reviews);
      this.textoCalificacion = this.reviewsService.getTextoCalificacion(this.promedioCalificacion);
    }
  }

  /**
   * Generar array de estrellas para visualización
   */
  getEstrellas(calificacion: number): { llena: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({ llena: i < calificacion }));
  }

  /**
   * Verificar si el usuario actual es el autor de la reseña
   */
  isAuthor(review: Review): boolean {
    return this.currentUserId !== null && review.usuario.id === this.currentUserId;
  }

  /**
   * Eliminar una reseña
   */
  eliminarReview(review: Review): void {
    if (!this.isAuthor(review)) {
      alert('No tienes permiso para eliminar esta reseña.');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar tu reseña?')) {
      return;
    }

    this.reviewsService.deleteReview(review.id).subscribe({
      next: () => {
        console.log(`✅ Reseña ${review.id} eliminada`);
        this.onReviewDeleted(review.id);
      },
      error: (error: Error) => {
        console.error('❌ Error al eliminar reseña:', error);
        alert(error.message || 'No se pudo eliminar la reseña.');
      }
    });
  }
}
