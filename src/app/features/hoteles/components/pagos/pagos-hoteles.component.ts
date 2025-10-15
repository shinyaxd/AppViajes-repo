import { Component, OnInit, inject } from '@angular/core'; // ✅ Añadimos 'inject'
import { ActivatedRoute, RouterModule, Router } from '@angular/router'; 
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
// import { HttpClientModule } from '@angular/common/http'; // OK, se mantiene comentado

// Asegúrate que la ruta de AuthService sea correcta para tu proyecto
import { AuthService } from '../../../../core/services/auth.service'; 
// ✅ Importar el servicio de reservas y la interfaz de payload
import { ReservasService, ReservaHabitacionPayload } from '../../services/reservas.service';

// ✅ Importación para usar async/await con Observables
import { firstValueFrom } from 'rxjs'; 
import { HttpClientModule } from '@angular/common/http';

// ==========================================================
// INTERFACES
// ==========================================================
interface ReservaItem {
  habitacionId: number;
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
  // ✅ Mantenemos la lista limpia de módulos conflictivos
  imports: [CommonModule, RouterModule, FormsModule, CurrencyPipe, DatePipe, HttpClientModule] 
})
export class PagosHotelesComponent implements OnInit {

  // ✅ Inyección por campos (más estable en Angular 19 Standalone)
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private reservasService = inject(ReservasService); // 👈 El foco de la inestabilidad
  
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
  
  reservaExitosa: boolean = false; 
  
  // ❌ Constructor vacío o eliminado, ya que usamos inject()
  constructor() { 
  }

// ------------------------------------------------------------------
// LÓGICA DE INICIALIZACIÓN
// ------------------------------------------------------------------
  ngOnInit(): void {
    
    this.route.queryParams.subscribe(params => {
      
      console.log('--- DEBUG: Parámetros de URL recibidos ---', params);
      
      this.nombreHotel = params['hotelNombre'] || 'Hotel Desconocido';
      this.ubicacion = params['ubicacion'] || '';
      
      this.adultosReservados = +params['adultos'] || 0;
      this.ninosReservados = +params['ninos'] || 0;
      this.habitacionesSolicitadas = +params['habitaciones'] || 0;

      const checkInStr = params['checkIn'];
      const checkOutStr = params['checkOut'];

      if (checkInStr && checkOutStr) {
        this.checkIn = new Date(checkInStr); 
        this.checkOut = new Date(checkOutStr);
        
        if (isNaN(this.checkIn.getTime()) || isNaN(this.checkOut.getTime())) {
             this.checkIn = null;
             this.checkOut = null;
        }
      }

      this.totalNoches = +params['noches'] || 0;
      this.tarifaBasica = +params['precioTotalGeneral'] || 0; 

      const numTiposReservados = +params['numTiposReservados'] || 0;
      console.log('DEBUG: Tipos de habitación esperados:', numTiposReservados);
      
      this.reservas = [];
      this.cantidadTotalCuartos = 0;

      for (let i = 0; i < numTiposReservados; i++) {
        const tipo = params[`reserva_${i}_tipo`];
        const cantidad = +params[`reserva_${i}_cant`];
        const precioNoche = +params[`reserva_${i}_precio_unitario`];
        const precioTotalReserva = +params[`reserva_${i}_precio_total`];
        const habitacionId = +params[`reserva_${i}_habitacion_id`]; 

        // ✅ Validación (habitacionId > 0) para asegurar que el ID existe
        if (tipo && cantidad > 0 && precioTotalReserva > 0 && habitacionId > 0) {
          this.reservas.push({ 
            habitacionId,
            tipo, 
            cantidad, 
            precioNoche, 
            precioTotalReserva 
          });
          this.cantidadTotalCuartos += cantidad;
        }
      }

      this.calcularImpuestosYTotal(); 
    });
  }

  calcularImpuestosYTotal(): void {
    if (this.tarifaBasica > 0) {
      this.montoImpuesto = this.tarifaBasica * this.impuesto;
      this.totalPagar = this.tarifaBasica + this.montoImpuesto;
    } else {
      this.montoImpuesto = 0;
      this.totalPagar = 0;
    }
  }

// ------------------------------------------------------------------
// LÓGICA DE PROCESAMIENTO DE PAGO
// ------------------------------------------------------------------
  procesarPago = async (): Promise<void> => {
    
    // ⚠️ Check de seguridad - No debería fallar con inject()
    if (!this.reservasService) {
        console.error('ERROR CRÍTICO: ReservasService es undefined. Falló la inyección por campos. SE REQUIERE LIMPIAR CACHÉ/REINICIO.');
        alert('No se pudo iniciar el proceso de reserva. El servicio de datos no está disponible.');
        return;
    }
    if (!this.authService) {
        console.error('ERROR CRÍTICO: AuthService es undefined. Falló la inyección por campos.');
        alert('No se pudo verificar la identidad. El servicio de autenticación no está disponible.');
        return;
    }

    // 1. Verificación de Autenticación y Rol
    if (!this.authService.isLoggedIn() || this.authService.getRole() !== 'viajero') {
        console.warn('Usuario no autenticado o no es viajero. Redirigiendo a login.');
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        return;
    }
    
    // 2. Extracción de fechas y validación de datos (prevención de llamada HTTP)
    const fechaInicio = this.checkIn ? this.checkIn.toISOString().split('T')[0] : null;
    const fechaFin = this.checkOut ? this.checkOut.toISOString().split('T')[0] : null;

    if (!fechaInicio || !fechaFin || this.reservas.length === 0) {
        alert('Error: Datos de reserva incompletos o inválidos. Por favor, verifica las fechas y las habitaciones seleccionadas.');
        return;
    }
    
    let todasExitosas = true;
    
    // 3. Procesar cada tipo de habitación (Lógica de Reserva)
    for (const item of this.reservas) {
        const payload: ReservaHabitacionPayload = {
            habitacion_id: item.habitacionId,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            cantidad: item.cantidad,
        };

        try {
            console.log(`Intentando reservar ${item.cantidad}x ${item.tipo} (ID: ${item.habitacionId})...`);
            
            // ✅ Llamada al servicio usando firstValueFrom
            await firstValueFrom(this.reservasService.crearReservaHotel(payload)); 

            console.log(`✅ Reserva exitosa para ${item.tipo}`);

        } catch (error: any) {
            // Se captura el Error lanzado desde el servicio (con el mensaje legible del backend)
            console.error(`❌ Error al reservar ${item.tipo}:`, error);
            todasExitosas = false;
            
            const mensajeError = error.message || 'Error desconocido en el servicio de reserva.';
            alert(`⚠️ La reserva de ${item.tipo} falló. Motivo: ${mensajeError}`);
            
            // Detener el proceso para evitar reservas parciales
            break; 
        }
    }
    
    // 4. Resultado Final
    if (todasExitosas) {
        this.reservaExitosa = true; 
        alert('✅ ¡Todas las habitaciones se reservaron con éxito! Revise su correo para la confirmación de pago.');
    } else {
        this.reservaExitosa = false;
    }
  }
}
