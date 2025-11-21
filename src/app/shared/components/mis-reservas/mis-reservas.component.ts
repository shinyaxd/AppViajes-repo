import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Reserva } from '../../models/reserva.model';
import { ImageUtils } from '../../utils/image.utils';
import { ReservasService } from '../../services/reservas.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-reservas.component.html',
  styleUrls: ['./mis-reservas.component.css']
})
export class MisReservasComponent {
  public reservas: Reserva[] = [];
  private sub?: Subscription;
  public selectedReserva: Reserva | null = null;
  public modalOpen = false;

  constructor(private reservasService: ReservasService) {}

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    try {
      if (img) img.src = '/public/img/imagen.jpg';
    } catch (e) {
      console.warn('[MIS-RESERVAS] error asignando placeholder local', e);
    }
  }

  getImageSrc(imgUrl?: string | null | undefined): string {
    // Si viene una URL válida, devuélvela; si no, usa el placeholder del proyecto
    try {
      if (imgUrl && ImageUtils.isValidImageUrl(imgUrl)) return imgUrl;
    } catch (e) {
      // en caso de error, caerá al placeholder
    }
    return '/public/img/imagen.jpg';
  }

  ngOnInit(): void {
    this.sub = this.reservasService.getMisReservas().subscribe(list => this.reservas = list);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  showDetail(r: Reserva) {
    // Abrir modal con la reserva seleccionada
    this.selectedReserva = r;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.selectedReserva = null;
  }
}
