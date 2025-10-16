import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() backgroundImage: string = ''; // Ruta de la imagen de fondo
  @Input() overlayGradient: string = 'linear-gradient(to right, rgba(35, 52, 99, 0.7), rgba(0, 0, 0, 0))'; // Gradiente del overlay
}
