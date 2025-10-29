import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { Router } from '@angular/router'; 
import { HotelService, HabitacionCreatePayload, HotelCreatePayload } from '../../../hoteles/services/hoteles.service'; // Importar interfaces
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Componente dedicado exclusivamente a la creación/edición de Hoteles.
 * Implementa la validación de roles en el envío.
 */
@Component({
  selector: 'app-hotel-formulario', 
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './formulario.component.html', // Usando la ruta correcta del HTML
  styleUrls: ['./formulario.component.css'], 
})
export class HotelFormComponent implements OnInit {
  // ======================================================
  // 🧩 Variables principales
  // ======================================================
  hotelForm!: FormGroup;
  enviado = false;
  enviando = false;
  mensajeExito = '';
  mensajeError = '';

  // ======================================================
  // 🧱 Inyección de dependencias
  // ======================================================
  private fb = inject(FormBuilder);
  private hotelService = inject(HotelService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // ======================================================
  // 🚀 Inicialización
  // ======================================================
  ngOnInit(): void {
    this.crearFormulario();
    // [DEBUG]: Muestra el estado inicial del formulario
    console.log('DEBUG: Formulario inicializado. Válido:', this.hotelForm.valid);
    if (this.hotelForm.invalid) {
        // Usa `getRawValue()` para ver la estructura, o solo los errores
        console.log('DEBUG: Errores iniciales del formulario:', this.hotelForm.errors);
        console.log('DEBUG: Estado de los controles de Hotel:', this.hotelGroup.controls);
        // Comprueba si la primera habitación está inválida y por qué
        console.log('DEBUG: Errores en la primera Habitación:', this.habitaciones.controls[0]?.errors); 
    }
  }

  // ======================================================
  // 🏗️ Construcción del formulario
  // ======================================================
  crearFormulario(): void {
    this.hotelForm = this.fb.group({
      // Agrupación para los datos del Servicio/Hotel (Payload 1)
      hotel: this.fb.group({
        nombre: ['', [Validators.required]],
        descripcion: ['', [Validators.required, Validators.minLength(10)]],
        direccion: ['', [Validators.required]],
        ciudad: ['', [Validators.required]],
        pais: ['', [Validators.required]],
        estrellas: [3, [Validators.required, Validators.min(1), Validators.max(5)]], 
        // AÑADIDO: Campo para el precio principal del Hotel, como lo pide la API
        precio_por_noche: [100, [Validators.required, Validators.min(1)]], 
        imagen_url: ['', [Validators.required]],
        // Inicializamos la galería con un solo campo de control vacío por defecto
        galeria_imagenes: this.fb.array<FormControl<string>>([]), 
      }),
      // Agrupación para las Habitaciones (Payload 2, se procesa internamente)
      habitaciones: this.fb.array<FormGroup>([this.crearHabitacion()]),
    });
  }

  // ======================================================
  // 🧾 Getters para acceder fácilmente a los campos
  // ======================================================
  get hotelGroup(): FormGroup {
    return this.hotelForm.get('hotel') as FormGroup;
  }

  get galeriaImagenes(): FormArray<FormControl<string>> {
    return this.hotelGroup.get('galeria_imagenes') as FormArray<FormControl<string>>;
  }

  get habitaciones(): FormArray<FormGroup> {
    return this.hotelForm.get('habitaciones') as FormArray<FormGroup>;
  }

  // ======================================================
  // 🖼️ Lógica de Galería de Imágenes
  // ======================================================
  agregarImagen(url: string): void {
    const MAX_IMAGES = 5; // Definimos el límite máximo de imágenes
  
    // 1. Verificación de límite máximo
    if (this.galeriaImagenes.length >= MAX_IMAGES) {
      console.warn(`[GALERIA] Límite de ${MAX_IMAGES} imágenes alcanzado. No se agregará la URL.`);
      // Opcional: podrías mostrar un mensaje de error al usuario aquí
      return;
    }
    
    // Acepta el argumento 'url' enviado desde el template, resolviendo el error de argumentos.
    // Solo agrega el control si la URL no está vacía.
    if (url && url.trim().length > 0) {
      this.galeriaImagenes.push(this.fb.control(url, { 
        validators: [Validators.required],
        nonNullable: true
      }) as FormControl<string>);
      console.log(`[GALERIA] Imagen agregada. Total: ${this.galeriaImagenes.length}/${MAX_IMAGES}`);
    }
  }
  
  eliminarImagen(index: number): void {
    // Elimina el campo de imagen en el índice dado
    this.galeriaImagenes.removeAt(index);
    console.log(`[GALERIA] Imagen eliminada. Total: ${this.galeriaImagenes.length}/5`);
  }

  // ======================================================
  // 🏨 Lógica de Habitaciones
  // ======================================================
  crearHabitacion(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      capacidad_adultos: [1, [Validators.required, Validators.min(1)]],
      capacidad_ninos: [0, [Validators.min(0)]],
      // [FIX]: Cambiamos el valor inicial de 0 a 100 para que cumpla con Validators.min(1) 
      // y no bloquee el formulario al inicio.
      precio_por_noche: [100, [Validators.required, Validators.min(1)]], 
      cantidad: [1, [Validators.required, Validators.min(1)]],
      descripcion: [''],
    });
  }

  agregarHabitacion(): void {
    this.habitaciones.push(this.crearHabitacion());
  }

  eliminarHabitacion(index: number): void {
    if (this.habitaciones.length > 1) { 
      this.habitaciones.removeAt(index);
    }
  }

  // ======================================================
  // 📤 Envío del formulario
  // ======================================================
  onSubmit(): void {
    this.enviado = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    // 1. Validar campos de formulario
    if (this.hotelForm.invalid) {
      this.mensajeError = '❌ Por favor, completa todos los campos requeridos correctamente.';
      // CRÍTICO: Marca todos los campos como 'touched' para que Angular muestre los errores visualmente.
      this.hotelForm.markAllAsTouched();
      return;
    }

    // 2. Validar Rol (Autorización en el frontend)
    const userRole = this.authService.getRole(); 
    if (userRole !== 'proveedor') {
        this.mensajeError = '🔒 Acceso denegado: Solo los proveedores pueden crear hoteles.';
        setTimeout(() => this.router.navigate(['/login']), 1500); 
        return;
    }

    this.enviando = true;
    
    // 3. Obtener el payload completo.
    // El formato es: { hotel: HotelCreatePayload, habitaciones: HabitacionCreatePayload[] }
    const payload = this.hotelForm.getRawValue() as { 
        hotel: HotelCreatePayload, 
        habitaciones: Array<Omit<HabitacionCreatePayload, 'servicio_id'>> 
    };

    console.log('📦 Enviando payload de Hotel:', payload);

    // 4. Llamada al servicio, que maneja el encadenamiento de POST /api/hoteles
    // seguido de POST /api/habitaciones/batch
    this.hotelService.createHotelWithHabitaciones(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.mensajeExito = '✅ Hotel registrado correctamente. Redirigiendo a tu panel...';
        
        // Limpiar y resetear el formulario
        this.hotelForm.reset({
            hotel: { estrellas: 3, precio_por_noche: 100 }, // Incluir valores por defecto
            habitaciones: []
        });
        // Asegurar que el FormArray de habitaciones se reinicie con 1 control
        while (this.habitaciones.length > 0) {
            this.habitaciones.removeAt(0);
        }
        this.agregarHabitacion(); 
        
        setTimeout(() => this.router.navigate(['/proveedor']), 1500); 
      },
      error: (error: any) => {
        this.enviando = false;
        console.error('❌ Error al registrar el hotel:', error);
        
        let errorMessage = '❌ Error de conexión o servidor desconocido.';

        // Lógica de parsing de error (robusta contra Laravel/Sanctum responses)
        if (error && error.status) {
          if (error.status === 401 || error.status === 403) {
            errorMessage = '🔒 Acceso no autorizado. Por favor, vuelve a iniciar sesión.';
          } else if (error.status === 422 && error.error && error.error.errors) {
            // Error de validación de Laravel (422 Unprocessable Entity)
            const validationErrors = error.error.errors;
            const firstErrorKey = Object.keys(validationErrors)[0];
            if (firstErrorKey && validationErrors[firstErrorKey].length > 0) {
              errorMessage = `❌ Error de validación en el campo '${firstErrorKey}': ${validationErrors[firstErrorKey][0]}`;
            } else {
              errorMessage = error.error.message || errorMessage;
            }
          } else if (error.error && error.error.message) {
            // Otros errores del servidor (e.g., 400, 500)
            errorMessage = `❌ Error del servidor: ${error.error.message}`;
          }
        } else if (error instanceof Error) {
            // Error lanzado por el HotelService (catchError)
            errorMessage = error.message;
        }

        this.mensajeError = errorMessage;
      },
    });
  }
}
