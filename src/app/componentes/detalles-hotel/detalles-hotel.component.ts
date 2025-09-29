import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'; // Mantenemos si se necesita en otros lugares, pero no lo usaremos directamente
import { HotelService, HotelData, Habitacion } from '../paginas/hoteles/services/hoteles.service'; // 💡 RUTA Y NOMBRE DE MÓDULO CORREGIDOS

// ------------------------------------

@Component({
  selector: 'app-detalles-hotel',
  templateUrl: './detalles-hotel.component.html',
  styleUrls: ['./detalles-hotel.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule]
})
export class DetallesHotelComponent implements OnInit {
  
  hotel: HotelData | undefined;
  habitacionesFiltradas: Habitacion[] = [];

  mostrarBotonReservar = false;

  checkInDate: string = '';
  checkOutDate: string = '';
  adultos: number = 0;      
  ninos: number = 0;        
  habitaciones: number = 0; 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService // 💡 ¡Inyectamos el servicio!
  ) {}

  ngOnInit(): void {
    
    this.route.queryParams.subscribe(qParams => {
        this.checkInDate = qParams['checkIn'] || '';
        this.checkOutDate = qParams['checkOut'] || '';
        this.adultos = +qParams['adultos'] || 1;          
        this.ninos = +qParams['ninos'] || 0;            
        this.habitaciones = +qParams['habitaciones'] || 1; 
    });
    
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const hotelId = idParam ? parseInt(idParam, 10) : undefined;

      if (hotelId) {
        this.getHotelDetails(hotelId); 
      }
    });
  }
  
  getHotelDetails(id: number): void {
    // 💡 Usamos el servicio en lugar de HttpClient
    this.hotelService.getHotelDetails(id).subscribe(
      (hotelData: HotelData) => { // Tipado explícito de la respuesta
        this.hotel = hotelData;

        if (this.hotel){
          this.filtrarHabitacionesPorCapacidad();
          
          this.habitacionesFiltradas.forEach(habitacion => {
            habitacion.seleccionada = 0;
          });
        }
        this.verificarSeleccion();
      },
      (error: any) => { // 💡 Tipado explícito para 'error'
        console.error('Error al cargar el detalle del hotel', error);
        // Opcional: Redirigir a una página de error si el hotel no existe.
        // this.router.navigate(['/error-404']);
      }
    );
  }

  private filtrarHabitacionesPorCapacidad(): void {
      if (!this.hotel) {
          this.habitacionesFiltradas = [];
          return;
      }

      const adultosSolicitados = this.adultos;
      const ninosSolicitados = this.ninos;
      
      // 💡 Tipado explícito para 'habitacion' en el filter
      this.habitacionesFiltradas = this.hotel.habitaciones.filter((habitacion: Habitacion) => {
          
          const soportaAdultos = habitacion.capacidad_adultos >= adultosSolicitados;
          const soportaNinos = habitacion.capacidad_ninos >= ninosSolicitados;
          
          const hayDisponibilidad = habitacion.unidades_disponibles > 0;

          return soportaAdultos && soportaNinos && hayDisponibilidad;
      });
  }

  actualizarSeleccion(habitacion: Habitacion, cambio: number): void{
    if (habitacion.seleccionada === undefined){
      habitacion.seleccionada = 0;
    }

    const limite = habitacion.unidades_disponibles; 

    const nuevaCantidad = habitacion.seleccionada + cambio;
    if (nuevaCantidad >= 0 && nuevaCantidad <= limite){
      habitacion.seleccionada = nuevaCantidad;
    }

    this.verificarSeleccion();
  }
  
  private verificarSeleccion(): void{
    this.mostrarBotonReservar = this.habitacionesFiltradas.some(hab => (hab.seleccionada ?? 0) > 0);
  }
  
  private calcularNoches(): number {
    if (!this.checkInDate || !this.checkOutDate) {
        return 0;
    }
    
    const dateIn = new Date(this.checkInDate + 'T00:00:00'); 
    const dateOut = new Date(this.checkOutDate + 'T00:00:00');
    
    const diffTime = Math.abs(dateOut.getTime() - dateIn.getTime());
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return diffDays > 0 ? diffDays : 0;
}
  
  reservarHotelFinal(): void {
    const nochesReservadas = this.calcularNoches(); 
    
    if (nochesReservadas <= 0) {
        console.error('Error: Las fechas son inválidas o la duración es cero. Abortando navegación.');
        return; 
    }
    
    const reservasSeleccionadas = this.habitacionesFiltradas
      .filter(hab => (hab.seleccionada ?? 0) > 0);

    if (!this.hotel || !reservasSeleccionadas || reservasSeleccionadas.length === 0) {
      console.error('No hay hotel o habitaciones seleccionadas para reservar. Abortando navegación.');
      return;
    }

    let precioTotalGeneral = 0; 

    // Crear un objeto para los parámetros de consulta
    const queryParams: { [key: string]: any } = {
        // 💡 CLAVE: Enviar el ID del hotel al componente de pagos
        hotelId: this.hotel.id, 
        hotelNombre: this.hotel.nombre,
        ubicacion: this.hotel.distrito + ', ' + this.hotel.ubicacion,
        checkIn: this.checkInDate, 
        checkOut: this.checkOutDate,
        adultos: this.adultos,     
        ninos: this.ninos,         
        habitaciones: this.habitaciones, 
        numTiposReservados: reservasSeleccionadas.length, 
        noches: nochesReservadas, 
    };

    reservasSeleccionadas.forEach((hab, index) => {
        const cantidad = hab.seleccionada ?? 0;
        const precioUnitario = hab.precio_por_noche;
        
        const precioTotalHabitacion = precioUnitario * cantidad * nochesReservadas;
        
        precioTotalGeneral += precioTotalHabitacion; 

        queryParams[`reserva_${index}_tipo`] = hab.nombre; 
        queryParams[`reserva_${index}_cant`] = cantidad;
        queryParams[`reserva_${index}_precio_unitario`] = precioUnitario; 
        queryParams[`reserva_${index}_precio_total`] = precioTotalHabitacion.toFixed(2); 
        queryParams[`reserva_${index}_id`] = hab.id; // CLAVE: ID de la habitación
    });
    
    queryParams['precioTotalGeneral'] = precioTotalGeneral.toFixed(2); 

    this.router.navigate(['/pagos-hoteles'], {
      queryParams: queryParams
    });
  }
}
