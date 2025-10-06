import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { HttpClientModule } from '@angular/common/http';

interface ReservaItem {
  tipo: string;
  cantidad: number;
  precioNoche: number; 
  precioTotalReserva: number; 
}

@Component({
  selector: 'app-pagos-hoteles',
  templateUrl: './pagos-hoteles.component.html',
  styleUrls: ['./pagos-hoteles.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule, CurrencyPipe, DatePipe] 
})
export class PagosHotelesComponent implements OnInit {

  nombreHotel: string = '';
  ubicacion: string = '';
  checkIn: Date | null = null;
  checkOut: Date | null = null;
  
  adultosReservados: number = 0;
  ninosReservados: number = 0;
  habitacionesSolicitadas: number = 0;
  
  reservas: ReservaItem[] = []; 
  cantidadTotalCuartos: number = 0; 
  
  totalNoches: number = 0;
  tarifaBasica: number = 0; 
  totalPagar: number = 0; 
  
  impuesto: number = 0.18; 
  montoImpuesto: number = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
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

      // 💡 Tomamos el total ya calculado en el componente anterior
      this.totalNoches = +params['noches'] || 0;
      this.tarifaBasica = +params['precioTotalGeneral'] || 0; 

      const numTiposReservados = +params['numTiposReservados'] || 0;
      this.reservas = [];
      this.cantidadTotalCuartos = 0;

      for (let i = 0; i < numTiposReservados; i++) {
        const tipo = params[`reserva_${i}_tipo`];
        const cantidad = +params[`reserva_${i}_cant`];
        const precioNoche = +params[`reserva_${i}_precio_unitario`];
        const precioTotalReserva = +params[`reserva_${i}_precio_total`];

        if (tipo && cantidad > 0 && precioTotalReserva > 0) {
          this.reservas.push({ 
            tipo, 
            cantidad, 
            precioNoche, 
            precioTotalReserva 
          });
          this.cantidadTotalCuartos += cantidad;
        }
      }

      // 💡 Aseguramos recalcular totales al final
      this.calcularImpuestosYTotal(); 
    });
  }

  calcularImpuestosYTotal(): void {
    if (this.tarifaBasica > 0) {  // 💡 No necesitas exigir noches aquí
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto;
    } else {
      this.montoImpuesto = 0;
      this.totalPagar = 0;
    }
  }
}
