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
        // Nombre: permitir letras, números, espacios, guiones y guion bajo (sin caracteres especiales)
        nombre: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-_]+$/)]],
        // Limitar descripción a 1000 caracteres
        descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
        direccion: ['', [Validators.required]],
        ciudad: ['', [Validators.required]],
        pais: ['', [Validators.required]],
        estrellas: [3, [Validators.required, Validators.min(1), Validators.max(5)]], 
        imagen_url: ['', [Validators.required]],
        // Inicializamos la galería con un solo campo de control vacío por defecto
        imagenes: this.fb.array<FormGroup>([]), 
      }),
      // Agrupación para las Habitaciones (Payload 2, se procesa internamente)
      habitaciones: this.fb.array<FormGroup>([this.crearHabitacion()]),
    });
    // Inicializar contadores de descripción por habitación
    this.habitacionesDescripcionLengths = this.habitaciones.controls.map(() => 0);
  }

  // Getter para el control 'nombre' del grupo 'hotel'
  get nombreControl(): FormControl {
    return this.hotelGroup.get('nombre') as FormControl;
  }

  // Sanitiza el valor del nombre eliminando caracteres especiales no permitidos
  private sanitizeName(value: string): string {
    if (!value) return '';
    return value.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-_]/g, '');
  }

  // Manejador para el evento input
  onNombreInput(event: any): void {
    try {
      const raw = event?.target?.value ?? '';
      const sanitized = this.sanitizeName(raw);
      if (sanitized !== raw) {
        // Actualiza el control sin emitir eventos secundarios
        this.nombreControl.setValue(sanitized, { emitEvent: false });
      }
    } catch (e) {
      // no hacer nada en caso de error no crítico
    }
  }

  // Manejador para pegar texto (paste)
  onNombrePaste(event: ClipboardEvent): void {
    if (!event) return;
    event.preventDefault();
    const text = (event.clipboardData || (window as any).clipboardData).getData('text') || '';
    const sanitized = this.sanitizeName(text);
    const current = this.nombreControl.value || '';
    this.nombreControl.setValue((current + sanitized).trim(), { emitEvent: false });
  }

  // Estado para mostrar/ocultar el popup de información del nombre
  // Estado para saber si el input 'nombre' está enfocado
  nombreFocused = false;

  onNombreFocus(): void {
    this.nombreFocused = true;
  }

  onNombreBlur(): void {
    this.nombreFocused = false;
  }

  // ======================================================
  // 🧾 Getters para acceder fácilmente a los campos
  // ======================================================
  get hotelGroup(): FormGroup {
    return this.hotelForm.get('hotel') as FormGroup;
  }

  get galeriaImagenes(): FormArray<FormGroup> {
    return this.hotelGroup.get('imagenes') as FormArray<FormGroup>;
  }

  get habitaciones(): FormArray<FormGroup> {
    return this.hotelForm.get('habitaciones') as FormArray<FormGroup>;
  }

  // Contador de caracteres para la descripción
  readonly MAX_DESCRIPCION = 1000;
  descripcionLength = 0;
  
  // Limite para la descripción de cada habitación (500 caracteres)
  readonly MAX_DESCRIPCION_HAB = 500;
  // Contadores individuales para las descripciones de las habitaciones
  habitacionesDescripcionLengths: number[] = [];

  get descripcionControl(): FormControl {
    return this.hotelGroup.get('descripcion') as FormControl;
  }

  onDescripcionInput(event: any): void {
    const raw = event?.target?.value ?? '';
    if (raw.length > this.MAX_DESCRIPCION) {
      const truncated = raw.slice(0, this.MAX_DESCRIPCION);
      // Actualizamos el control con el valor truncado sin volver a emitir el evento
      this.descripcionControl.setValue(truncated, { emitEvent: false });
      this.descripcionLength = this.MAX_DESCRIPCION;
    } else {
      this.descripcionLength = raw.length;
    }
  }

  // ======================================================
  // 🖼️   Galería de Imágenes
  // ======================================================
  agregarImagen(url: string, alt:string=''): void {
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
      const imagenGroup = this.fb.group({
        url: [url, [Validators.required]],
        alt: [alt], // opcional
      });
      this.galeriaImagenes.push(imagenGroup);
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
      descripcion: ['', [Validators.maxLength(this.MAX_DESCRIPCION_HAB)]],
    });
  }

  agregarHabitacion(): void {
    this.habitaciones.push(this.crearHabitacion());
    // Inicializar contador para la nueva habitación
    this.habitacionesDescripcionLengths.push(0);
  }

  eliminarHabitacion(index: number): void {
    if (this.habitaciones.length > 1) { 
      this.habitaciones.removeAt(index);
      // Eliminar contador asociado
      this.habitacionesDescripcionLengths.splice(index, 1);
    }
  }

  // Maneja el input de la descripción de una habitación específica
  onHabitacionDescripcionInput(event: any, index: number): void {
    const raw = event?.target?.value ?? '';
    if (raw.length > this.MAX_DESCRIPCION_HAB) {
      const truncated = raw.slice(0, this.MAX_DESCRIPCION_HAB);
      const ctrl = this.habitaciones.at(index).get('descripcion') as FormControl;
      if (ctrl) {
        ctrl.setValue(truncated, { emitEvent: false });
      }
      this.habitacionesDescripcionLengths[index] = this.MAX_DESCRIPCION_HAB;
    } else {
      this.habitacionesDescripcionLengths[index] = raw.length;
    }
  }

  // ======================================================
  // 📤 Envío del formulario
  // ======================================================
  onSubmit(): void {
    this.enviado = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    // 1. Validar campo 'nombre' específico para mostrar aviso claro
    if (this.nombreControl.invalid) {
      this.mensajeError = '❌ Nombre inválido: no se permiten caracteres especiales.';
      this.nombreControl.markAsTouched();
      const el = document.getElementById('mensajeError');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // 2. Validar campos de formulario (resto)
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
    
    // 3. Obtener y normalizar el payload completo.
    // Construimos manualmente las habitaciones para asegurarnos de incluir y sanitizar `descripcion`.
    const raw = this.hotelForm.getRawValue();
    const habitacionesPayload = (raw.habitaciones || []).map((h: any) => ({
      nombre: h.nombre,
      capacidad_adultos: h.capacidad_adultos,
      capacidad_ninos: h.capacidad_ninos,
      precio_por_noche: h.precio_por_noche,
      cantidad: h.cantidad,
      descripcion: (h.descripcion || '').toString().trim(),
    })) as Array<Omit<HabitacionCreatePayload, 'servicio_id'>>;

    const payload = {
      hotel: raw.hotel,
      habitaciones: habitacionesPayload
    } as { hotel: HotelCreatePayload, habitaciones: Array<Omit<HabitacionCreatePayload, 'servicio_id'>> };

    console.log('📦 Enviando payload de Hotel (sanitizado):', payload);
    // DEBUG: mostrar payload antes de enviar para inspección rápida
    try { window.alert('Payload a enviar (crear hotel):\n' + JSON.stringify(payload, null, 2)); } catch (e) { /* ignore */ }

    // 4. Llamada al servicio, que maneja el encadenamiento de POST /api/hoteles
    // seguido de POST /api/habitaciones/batch
    this.hotelService.createHotelWithHabitaciones(payload).subscribe({
      next: (res) => {
        console.log('[CREAR] Respuesta del servidor al crear hotel:', res);
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
