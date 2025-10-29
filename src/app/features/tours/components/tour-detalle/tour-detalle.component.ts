import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { TourService, TourDetalles } from '../../services/tour.service';
import { ServicioDetalleHeaderComponent, ServicioDetalleData } from '../../../../shared/components/servicio-detalle-header/servicio-detalle-header.component';
import { ReviewsSectionComponent } from '../../../../shared/components/reviews-section/reviews-section.component';
import { ImageUtils } from '../../../../shared/utils/image.utils';

@Component({
  selector: 'app-tour-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, ServicioDetalleHeaderComponent, ReviewsSectionComponent, CurrencyPipe, DatePipe],
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

  // 🆕 PROPIEDADES DE FILTRADO POR FECHA
  checkInDate: string | null = null;
  checkOutDate: string | null = null;
  mensajeDisponibilidad: string = ''; // Mensaje para indicar si hay o no tours

  // Nuevas propiedades para reserva
  salidaSeleccionada: any = null;
  salidasFiltradas: any[] = [];
  cantidadAdultos = 1;
  cantidadNinos = 0;
  usarFechaTourDirecta = false; // Si el tour tiene fecha directa sin salidas

  ngOnInit(): void {
    // 🆕 1. Obtener fechas de los QueryParams (como en el detalle-hotel)
    this.route.queryParams.subscribe(qParams => {
      this.checkInDate = qParams['checkIn'] || null;
      this.checkOutDate = qParams['checkOut'] || null;
      console.log('[INIT] Fechas de búsqueda:', { checkIn: this.checkInDate, checkOut: this.checkOutDate });
    });

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
        this.procesarSalidas(); 
      },
      error: (error) => {
        console.error(`❌ Error al cargar el tour ID ${id}:`, error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  /**
   * Procesa las salidas del tour o usa la fecha directa del tour
   */
  procesarSalidas(): void {
    if (!this.tour) return;

    // Si tiene salidas definidas, usarlas
    if (this.tour.salidas && this.tour.salidas.length > 0) {
      this.filtrarSalidasDisponibles(); 
      this.usarFechaTourDirecta = false;
      console.log(`✅ Tour tiene ${this.salidasFiltradas.length} salidas disponibles después de filtro`);
    } 
    // Si no tiene salidas pero tiene fecha en tour, crear una salida virtual
    else if (this.tour.tour?.fecha && this.tour.tour?.cupos) {
      
      // 🆕 FILTRADO DE FECHA DIRECTA: Verificar si la fecha única cae dentro del rango
      const tourDate = new Date(this.tour.tour.fecha);
      const startFilter = this.checkInDate ? new Date(this.checkInDate) : null;
      const endFilter = this.checkOutDate ? new Date(this.checkOutDate) : null;

      const estaDentroDelRango = (!startFilter || tourDate >= startFilter) &&
                                 (!endFilter || tourDate <= endFilter);

      if (estaDentroDelRango) {
        this.usarFechaTourDirecta = true;
        const salidaVirtual = {
          id: this.tour.tour.servicio_id || this.tour.id, 
          fecha_salida: this.tour.tour.fecha,
          cupos_disponibles: this.tour.tour.cupos
        };
        this.salidasFiltradas = [salidaVirtual];
        this.mensajeDisponibilidad = '';
        console.log('📅 Usando fecha directa del tour (salida virtual):', salidaVirtual);
      } else {
        this.usarFechaTourDirecta = false;
        this.salidasFiltradas = [];
        this.mensajeDisponibilidad = '❌ No hay tours disponibles para las fechas seleccionadas.';
        console.log('❌ Fecha directa no coincide con el rango de búsqueda.');
      }
    } else {
      console.error('❌ Tour sin salidas ni fecha definida');
      this.salidasFiltradas = [];
    }
    
    // 🆕 Si el resultado final de salidas es 0, mostrar mensaje
    if (!this.usarFechaTourDirecta && this.salidasFiltradas.length === 0) {
      this.mensajeDisponibilidad = '❌ No hay tours disponibles para las fechas seleccionadas.';
    } else {
      this.mensajeDisponibilidad = '';
    }
  }

  /**
   * Filtra salidas disponibles (solo fechas futuras, con cupos y DENTRO DEL RANGO)
   */
  filtrarSalidasDisponibles(): void {
    if (!this.tour?.salidas) return;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 🆕 Convertir las fechas de búsqueda a objetos Date para la comparación
    const fechaInicioBusqueda = this.checkInDate ? new Date(this.checkInDate) : null;
    const fechaFinBusqueda = this.checkOutDate ? new Date(this.checkOutDate) : null;
    
    if (fechaInicioBusqueda) fechaInicioBusqueda.setHours(0, 0, 0, 0);
    // El fin de la búsqueda debe incluir todo el día de checkOutDate
    if (fechaFinBusqueda) fechaFinBusqueda.setHours(23, 59, 59, 999);


    this.salidasFiltradas = this.tour.salidas
      .map(salida => {
        // Calcular cupos disponibles
        const cuposDisponibles = salida.cupo_total - salida.cupo_reservado;
        
        // Transformar al formato esperado por el componente
        return {
          id: salida.id,
          fecha_salida: salida.fecha,
          cupos_disponibles: cuposDisponibles,
          hora: salida.hora,
          estado: salida.estado
        };
      })
      .filter(salida => {
        // Normalizar la fecha de salida a medianoche para comparación
        const fechaSalida = new Date(salida.fecha_salida);
        const fechaSalidaSoloDia = new Date(fechaSalida.getFullYear(), fechaSalida.getMonth(), fechaSalida.getDate());

        // 1. Filtrar solo fechas futuras (desde hoy) y con cupos disponibles
        const esFuturaYConCupos = fechaSalidaSoloDia >= hoy && salida.cupos_disponibles > 0;
        if (!esFuturaYConCupos) return false;
        
        // 🆕 2. FILTRO POR RANGO DE FECHAS (Check In / Check Out)
        let estaEnRango = true;
        
        // La fecha de salida debe ser mayor o igual al Check In
        if (fechaInicioBusqueda && fechaSalidaSoloDia < fechaInicioBusqueda) {
          estaEnRango = false;
        }
        
        // La fecha de salida debe ser menor o igual al Check Out (incluyendo todo el día)
        if (fechaFinBusqueda && fechaSalida > fechaFinBusqueda) {
          estaEnRango = false;
        }

        return estaEnRango;
      })
      .sort((a, b) => {
        return new Date(a.fecha_salida).getTime() - new Date(b.fecha_salida).getTime();
      });

    console.log(`📅 Salidas disponibles después del filtro de rango: ${this.salidasFiltradas.length}`, this.salidasFiltradas);
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
    // 🆕 Incluir las fechas de búsqueda al volver
    this.router.navigate(['/tour/resultados'], {
        queryParams: {
            checkIn: this.checkInDate,
            checkOut: this.checkOutDate,
        }
    });
  }

  /**
   * Total de personas seleccionadas
   */
  get totalPersonas(): number {
    return this.cantidadAdultos + this.cantidadNinos;
  }

  /**
   * Precio total calculado
   */
  get precioTotal(): number {
    if (!this.tour?.tour?.precio) return 0;
    const precioPorPersona = parseFloat(this.tour.tour.precio as any);
    return precioPorPersona * this.totalPersonas;
  }

  /**
   * Cupos máximos disponibles de la salida seleccionada
   */
  get cuposDisponibles(): number {
    if (!this.salidaSeleccionada) return 0;
    return this.salidaSeleccionada.cupos_disponibles || 0;
  }

  /**
   * Seleccionar una fecha de salida
   */
  seleccionarSalida(salida: any): void {
    if (salida.cupos_disponibles === 0) {
      alert('Esta salida no tiene cupos disponibles.');
      return;
    }
    
    this.salidaSeleccionada = salida;
    console.log('✅ Salida seleccionada:', salida);
    
    // Reset cantidades al cambiar de salida
    this.cantidadAdultos = 1;
    this.cantidadNinos = 0;
    
    // Scroll suave a la sección de cantidad
    setTimeout(() => {
      const element = document.querySelector('.cantidad-personas-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  /**
   * Actualizar cantidad de personas
   */
  actualizarCantidadPersonas(tipo: 'adultos' | 'ninos', cambio: number): void {
    if (!this.salidaSeleccionada) return;

    const cuposMax = this.salidaSeleccionada.cupos_disponibles;

    if (tipo === 'adultos') {
      const nueva = this.cantidadAdultos + cambio;
      if (nueva >= 1 && (nueva + this.cantidadNinos) <= cuposMax) {
        this.cantidadAdultos = nueva;
      }
    } else {
      const nueva = this.cantidadNinos + cambio;
      if (nueva >= 0 && (this.cantidadAdultos + nueva) <= cuposMax) {
        this.cantidadNinos = nueva;
      }
    }

    console.log(`📊 Personas actualizadas: ${this.cantidadAdultos} adultos, ${this.cantidadNinos} niños`);
  }

  /**
   * Navegar a la página de pagos
   */
  reservarTour(): void {
    if (!this.tour || !this.salidaSeleccionada || this.totalPersonas === 0) {
      alert('Por favor selecciona una fecha y cantidad de personas.');
      return;
    }

    // Preparar fecha de salida
    let fechaSalida = this.salidaSeleccionada.fecha_salida;
    if (typeof fechaSalida !== 'string') {
      // Convertir fecha a string YYYY-MM-DD
      const fecha = new Date(fechaSalida);
      fechaSalida = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    // Si la fecha viene con timestamp, extraer solo la fecha
    if (fechaSalida.includes('T')) {
      fechaSalida = fechaSalida.split('T')[0];
    }

    const queryParams = {
      tourNombre: this.tour.nombre,
      ubicacion: `${this.tour.pais}, ${this.tour.ciudad}`,
      salidaId: this.salidaSeleccionada.id,
      tourId: this.tour.id,
      fechaSalida: fechaSalida,
      adultos: this.cantidadAdultos,
      ninos: this.cantidadNinos,
      totalPersonas: this.totalPersonas,
      precioPorPersona: this.tour.tour?.precio,
      precioTotal: this.precioTotal.toFixed(2),
      duracion: this.tour.tour?.duracion || 0,
      categoria: this.tour.tour?.categoria || ''
    };

    console.log('[NAV] Navegando a pagos de tours:', queryParams);
    this.router.navigate(['/tour/pagos'], { queryParams })
      .then(success => {
        console.log('[NAV] Navegación exitosa:', success);
        if (!success) {
          console.error('[NAV] ❌ La navegación fue bloqueada o falló');
        }
      })
      .catch(error => {
        console.error('[NAV] ❌ Error en navegación:', error);
      });
  }

  /**
   * Scroll a la sección de salidas
   */
  scrollToSalidas(): void {
    const element = document.getElementById('seccion-salidas');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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