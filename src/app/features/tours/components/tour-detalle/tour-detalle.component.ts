import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TourService, TourDetalles } from '../../services/tour.service';
import { ServicioDetalleHeaderComponent, ServicioDetalleData } from '../../../../shared/components/servicio-detalle-header/servicio-detalle-header.component';
import { ImageUtils } from '../../../../shared/utils/image.utils';

@Component({
  selector: 'app-tour-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, ServicioDetalleHeaderComponent],
  templateUrl: './tour-detalle.component.html',
  styleUrls: ['./tour-detalle.component.css']
})
export class TourDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tourService = inject(TourService);

  tour: TourDetalles | null = null;
  loading = true;
  error = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const tourId = idParam ? parseInt(idParam, 10) : undefined;

      if (tourId) {
        this.getTourDetails(tourId);
      } else {
        console.error("❌ No se encontró 'id' en los parámetros de la ruta.");
        this.error = true;
        this.loading = false;
      }
    });
  }

  getTourDetails(id: number): void {
    console.log(`Cargando detalles para tour ID: ${id}`);
    this.tourService.getTourById(id).subscribe({
      next: (data) => {
        this.tour = data;
        this.loading = false;
        console.log('✅ Tour cargado:', this.tour);
      },
      error: (error) => {
        console.error(`❌ Error al cargar el tour ID ${id}:`, error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  get servicioData(): ServicioDetalleData | null {
    if (!this.tour) return null;

    // Obtener datos del tour con tipado correcto
    const tourData = this.tour.tour;
    
    // Usar ImageUtils para obtener y procesar imágenes
    const imagenesFromApi = this.tour.imagenes?.map((img) => img.url || img.imagen_url).filter((url): url is string => !!url) || [];
    const todasImagenes = ImageUtils.getAllImages(this.tour.imagen_url, imagenesFromApi);
    
    // Asegurar que siempre haya al menos una imagen
    const imagenesFinal = todasImagenes.length > 0 
      ? todasImagenes 
      : [ImageUtils.getPlaceholder('tour')];

    // Convertir duración de minutos a formato legible
    const duracionHoras = tourData?.duracion 
      ? `${Math.floor(tourData.duracion / 60)} Horas` 
      : undefined;

    return {
      nombre: this.tour.nombre || 'Tour sin nombre',
      ciudad: this.tour.ciudad || '',
      pais: this.tour.pais || '',
      precio: tourData?.precio ? parseFloat(tourData.precio as any) : null,
      descripcion: this.tour.descripcion || '',
      duracion: duracionHoras,
      galeria_imagenes: imagenesFinal
    };
  }

  get breadcrumbItems(): string[] {
    if (!this.tour) return [];
    return [this.tour.pais, this.tour.ciudad, this.tour.nombre];
  }

  volverAResultados(): void {
    this.router.navigate(['/tour/resultados']);
  }

  reservarTour(): void {
    console.log('🎯 Reservar tour:', this.tour);
    // TODO: Implementar navegación a página de reservas de tours
    alert('Funcionalidad de reserva de tours en desarrollo');
  }

  /**
   * Obtiene el ícono de FontAwesome correspondiente al item
   */
  getIconForItem(item: string): string {
    const itemLower = item.toLowerCase();
    
    // Mapeo de palabras clave a íconos
    const iconMap: { [key: string]: string } = {
      'ropa': 'fas fa-tshirt',
      'cómoda': 'fas fa-tshirt',
      'zapatillas': 'fas fa-shoe-prints',
      'zapatos': 'fas fa-shoe-prints',
      'agua': 'fas fa-tint',
      'botella': 'fas fa-tint',
      'bloqueador': 'fas fa-sun',
      'protector solar': 'fas fa-sun',
      'solar': 'fas fa-sun',
      'gorra': 'fas fa-hat-cowboy',
      'sombrero': 'fas fa-hat-cowboy',
      'gafas': 'fas fa-glasses',
      'lentes': 'fas fa-glasses',
      'cámara': 'fas fa-camera',
      'fotos': 'fas fa-camera',
      'toalla': 'fas fa-bath',
      'baño': 'fas fa-shower',
      'mochila': 'fas fa-backpack',
      'bolsa': 'fas fa-shopping-bag',
      'dinero': 'fas fa-money-bill-wave',
      'efectivo': 'fas fa-money-bill-wave',
      'documento': 'fas fa-id-card',
      'dni': 'fas fa-id-card',
      'pasaporte': 'fas fa-passport'
    };

    // Buscar coincidencia
    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (itemLower.includes(keyword)) {
        return icon;
      }
    }

    // Ícono por defecto
    return 'fas fa-check';
  }
}
