import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router'; 
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 

// Asegúrate que estos tipos sean correctos para tu servicio
import { HotelService, ReservaItem, ReservaPayload, ReservaHabitacionPayload } from '../paginas/hoteles/services/hoteles.service';


@Component({
  selector: 'app-pagos-hoteles',
  templateUrl: './pagos-hoteles.component.html',
  styleUrls: ['./pagos-hoteles.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, DatePipe] 
})
export class PagosHotelesComponent implements OnInit {

  // --- Propiedades que contienen la información solicitada ---
  hotelId: number = 0; 
  nombreHotel: string = ''; // Nombre del hotel
  ubicacion: string = '';
  checkIn: Date | null = null; // Check In
  checkOut: Date | null = null; // Check Out
  
  adultosReservados: number = 0; // Número de adultos
  ninosReservados: number = 0; // Número de niños
  
  reservas: ReservaItem[] = []; // Tipo y cantidad de habitaciones elegidas
  reservasIds: { [key: number]: number } = {}; 
  cantidadTotalCuartos: number = 0; // Cantidad total de cuartos
  
  totalNoches: number = 0; // Número de noches
  tarifaBasica: number = 0; 
  totalPagar: number = 0; // Precio total a pagar
  
  impuesto: number = 0.18; 
  montoImpuesto: number = 0;

  // --- Propiedades del Formulario del Cliente ---
  datosCliente = {
    nombre: '',
    email: '',
    telefono: ''
  };
  
  isProcessing: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute, 
    private router: Router, 
    private hotelService: HotelService 
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      // 0. ID del Hotel
      this.hotelId = +params['hotelId'] || 0; 
      
      // 1. Información del Hotel y Fechas
      this.nombreHotel = params['hotelNombre'] || 'Hotel Desconocido';
      this.ubicacion = params['ubicacion'] || '';
      
      this.adultosReservados = +params['adultos'] || 0;
      this.ninosReservados = +params['ninos'] || 0;

      const checkInStr = params['checkIn'];
      const checkOutStr = params['checkOut'];

      if (checkInStr && checkOutStr) {
        const checkInCandidate = new Date(checkInStr + 'T00:00:00'); 
        const checkOutCandidate = new Date(checkOutStr + 'T00:00:00');
        
        if (!isNaN(checkInCandidate.getTime()) && !isNaN(checkOutCandidate.getTime())) {
            this.checkIn = checkInCandidate;
            this.checkOut = checkOutCandidate;
        }
      }
      
      // 2. CAPTURAR CÁLCULOS CLAVE
      this.totalNoches = +params['noches'] || 0;
      this.tarifaBasica = +params['precioTotalGeneral'] || 0;
      
      // 3. Obtener múltiples reservas
      const numTiposReservados = +params['numTiposReservados'] || 0;
      this.reservas = []; 
      this.cantidadTotalCuartos = 0; 
      this.reservasIds = {}; 

      for (let i = 0; i < numTiposReservados; i++) { 
        const tipo = params[`reserva_${i}_tipo`];
        const cantidad = +params[`reserva_${i}_cant`];
        const precioNoche = +params[`reserva_${i}_precio_unitario`];
        const precioTotalReserva = +params[`reserva_${i}_precio_total`];
        const habitacionId = +params[`reserva_${i}_id`];

        if (tipo && cantidad > 0 && precioTotalReserva > 0 && habitacionId > 0) {
          this.reservas.push({ 
              tipo, 
              cantidad, 
              precioNoche, 
              precioTotalReserva 
          });
          this.cantidadTotalCuartos += cantidad;
          this.reservasIds[i] = habitacionId; 
        }
      }

      // 4. Calcular el monto final
      this.calcularImpuestosYTotal(); 
      
      if (this.hotelId === 0 || this.totalPagar <= 0 || this.reservas.length === 0) {
          this.errorMessage = 'Datos de reserva incompletos o inválidos. Por favor, vuelva a la página del hotel.';
      }
    });
  }

  calcularImpuestosYTotal(): void {
    if (this.tarifaBasica > 0 && this.totalNoches > 0) {
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto;
    } else {
        this.montoImpuesto = 0;
        this.totalPagar = 0;
    }
  }
  
  // MODIFICACIÓN: Solamente procesa y muestra el mensaje, sin redirección a login.
  procesarReserva(form: any): void {
    if (form.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos del cliente.';
      return;
    }
    if (this.hotelId === 0 || this.totalPagar <= 0 || this.reservas.length === 0) {
       this.errorMessage = 'No se puede procesar la reserva. Los datos del hotel son inválidos.';
       return;
    }
    
    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = ''; // Limpiar mensaje de éxito previo
    
    const habitacionesPayload: ReservaHabitacionPayload[] = [];
    
    this.reservas.forEach((reserva, index) => {
        const habitacionId = this.reservasIds[index];
        
        if (habitacionId) {
            habitacionesPayload.push({
                habitacionId: habitacionId,
                cantidad: reserva.cantidad,
                precioNoche: reserva.precioNoche
            });
        }
    });

    const payload: ReservaPayload = {
      hotelId: this.hotelId,
      cliente: this.datosCliente,
      checkIn: this.checkIn?.toISOString().split('T')[0] || '', 
      checkOut: this.checkOut?.toISOString().split('T')[0] || '',
      noches: this.totalNoches,
      precioTotal: parseFloat(this.totalPagar.toFixed(2)),
      habitaciones: habitacionesPayload
    };

    // Llama al servicio para confirmar la reserva
    this.hotelService.confirmarReserva(payload).subscribe({
        next: (response: { reservaId: string } | any) => { 
            this.isProcessing = false;
            const reservaId = response.reservaId || response.id || 'N/A';
            
            // ✅ Muestra el anuncio de "se reservó su habitacion"
            this.successMessage = `¡Se reservó su habitación! ID de confirmación: ${reservaId}.`;
            
            // Redireccionar después del anuncio
            setTimeout(() => {
                this.router.navigate(['/']); 
            }, 3000);
        },
        error: (err: any) => { 
            this.isProcessing = false;
            this.errorMessage = 'Error al procesar la reserva. Inténtelo de nuevo o contacte a soporte.';
            console.error('Error del backend al reservar:', err);
        }
    });
  }
}