import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { HttpClientModule } from '@angular/common/http';

// Define la estructura esperada para cada reserva (actualizada)
interface ReservaItem {
  tipo: string;
  cantidad: number;
  precioNoche: number; 
  precioTotalReserva: number; // 💡 Nuevo campo para el subtotal
}

@Component({
  selector: 'app-pagos-hoteles',
  templateUrl: './pagos-hoteles.component.html',
  styleUrls: ['./pagos-hoteles.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule, CurrencyPipe, DatePipe] 
})
export class PagosHotelesComponent implements OnInit {

  // Propiedades del Hotel y Fechas
  nombreHotel: string = '';
  ubicacion: string = '';
  checkIn: Date | null = null;
  checkOut: Date | null = null;
  
  // Propiedades: Filtros de búsqueda iniciales
  adultosReservados: number = 0;
  ninosReservados: number = 0;
  habitacionesSolicitadas: number = 0;
  
  // Propiedades de Reserva
  reservas: ReservaItem[] = []; // Se usará en el *ngFor
  cantidadTotalCuartos: number = 0; // Cuartos realmente reservados
  
  // Propiedades de Cálculo (Ahora leídos de los query params)
  totalNoches: number = 0; // 💡 Leído de la URL
  tarifaBasica: number = 0; // 💡 Leído de la URL (PrecioTotalGeneral antes de impuestos)
  totalPagar: number = 0; 
  
  // Parámetros de Impuestos
  impuesto: number = 0.18; 
  montoImpuesto: number = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    
    this.route.queryParams.subscribe(params => {
      // 1. Información del Hotel y Fechas
      this.nombreHotel = params['hotelNombre'] || 'Hotel Desconocido';
      this.ubicacion = params['ubicacion'] || '';
      
      this.adultosReservados = +params['adultos'] || 0;
      this.ninosReservados = +params['ninos'] || 0;
      this.habitacionesSolicitadas = +params['habitaciones'] || 0;

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
      
      // 💡 2. CAPTURAR Y ASIGNAR LOS CÁLCULOS CLAVE (Noches y Total)
      // Se leen los valores que ya fueron calculados en el componente anterior
      this.totalNoches = +params['noches'] || 0;
      const precioTotalGeneral = +params['precioTotalGeneral'] || 0;
      
      // La "tarifa básica" es el precio total antes de impuestos. 
      // Si el componente anterior no consideró impuestos, asumimos que el total es la base.
      this.tarifaBasica = precioTotalGeneral;

      // 💡 3. Obtener múltiples reservas
      // Usamos 'numTiposReservados' que fue el nombre que usaste en el componente anterior.
      const numTiposReservados = +params['numTiposReservados'] || 0;
      this.reservas = []; // Resetear el array
      this.cantidadTotalCuartos = 0; // Resetear el contador de cuartos

      for (let i = 0; i < numTiposReservados; i++) {
        const tipo = params[`reserva_${i}_tipo`];
        const cantidad = +params[`reserva_${i}_cant`];
        // 💡 LEER el precio unitario por noche
        const precioNoche = +params[`reserva_${i}_precio_unitario`];
        // 💡 LEER el precio TOTAL calculado para este tipo de habitación
        const precioTotalReserva = +params[`reserva_${i}_precio_total`];

        if (tipo && cantidad > 0 && precioTotalReserva > 0) {
          this.reservas.push({ 
              tipo, 
              cantidad, 
              precioNoche, // Guardamos el precio unitario para el desglose
              precioTotalReserva // Guardamos el subtotal final
          });
          this.cantidadTotalCuartos += cantidad;
        }
      }

      // 4. Calcular el monto final (ya con los datos clave leídos)
      this.calcularImpuestosYTotal(); 
    });
  }

  /**
   * Calcula los impuestos y el total a pagar usando la tarifa básica leída de la URL.
   */
  calcularImpuestosYTotal(): void {
    // CORRECCIÓN: Usamos this.tarifaBasica (que es el precioTotalGeneral de la URL)
    if (this.tarifaBasica > 0 && this.totalNoches > 0) {
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto;
    } else {
        this.montoImpuesto = 0;
        this.totalPagar = 0;
    }
  }
}