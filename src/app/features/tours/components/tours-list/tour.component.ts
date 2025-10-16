// src/app/componentes/paginas/tours/tour.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BuscadorComponent } from '../../../../shared/components/buscador/buscador.component';
import { BannerComponent } from '../../../../shared/components/ui/banner/banner.component';
import { CardGridComponent, CardGridItem } from '../../../../shared/components/ui/card-grid/card-grid.component';
import { TourService, TourData } from '../../services/tour.service';

// Categorías estáticas con imágenes que vendrán de la API
interface TourCategoria {
  nombre: string;
  descripcion: string;
  imagen_url?: string;
}

@Component({
  selector: 'app-tour',
  standalone: true,
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    BuscadorComponent,
    BannerComponent,
    CardGridComponent
  ]
})
export class TourComponent implements OnInit {
  toursCategorias: CardGridItem[] = [];
  mensajeError: string | null = null;

  // Categorías estáticas con imágenes del public folder
  private readonly CATEGORIAS: TourCategoria[] = [
    {
      nombre: 'Aventura',
      descripcion: 'Explora los Andes y vive una experiencia inigualable.',
      imagen_url: '/public/img/aventura.png'
    },
    {
      nombre: 'Gastronomía',
      descripcion: 'Descubre los secretos de la comida peruana.',
      imagen_url: '/public/img/gastronomia.png'
    },
    {
      nombre: 'Cultura',
      descripcion: 'Explora el centro histórico y sus secretos.',
      imagen_url: '/public/img/cultura.png'
    },
    {
      nombre: 'Relajación',
      descripcion: 'Desconexión total en el paraíso.',
      imagen_url: '/public/img/relajacion.png'
    }
  ];

  constructor(
    private tourService: TourService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCategoriasConImagenes();
    }
  }

  /**
   * Carga las categorías estáticas con imágenes locales (siempre disponibles)
   * Si la API tiene tours, puede usar sus imágenes como alternativa
   */
  cargarCategoriasConImagenes() {
    // Primero usar categorías con imágenes estáticas locales
    this.toursCategorias = this.CATEGORIAS.map(cat => ({
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      imagen_url: cat.imagen_url, // Usa las imágenes de /img/
      categoria: cat.nombre
    }));

    // Intentar obtener tours de la API para mejorar con galería si está disponible
    this.tourService.getTours().subscribe({
      next: (tours: TourData[]) => {
        // Enriquecer con galería de imágenes si hay tours en la API
        this.toursCategorias = this.CATEGORIAS.map(cat => {
          const tourDeCategoria = tours.find(t => t.categoria === cat.nombre);
          
          return {
            nombre: cat.nombre,
            descripcion: cat.descripcion,
            imagen_url: cat.imagen_url, // Mantener imagen estática local
            galeria_imagenes: tourDeCategoria?.galeria_imagenes || [],
            categoria: cat.nombre
          };
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar tours desde la API:', error.message);
        // Las categorías ya están cargadas con imágenes estáticas, no hacer nada
      }
    });
  }

  /**
   * Navega a resultados de tours filtrados por categoría
   */
  navegarPorCategoria(item: CardGridItem): void {
    this.router.navigate(['/tour/resultados'], {
      queryParams: {
        categoria: item.nombre
      }
    });
  }
}
