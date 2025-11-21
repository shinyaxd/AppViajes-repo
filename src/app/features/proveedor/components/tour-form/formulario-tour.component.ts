import { Component, OnInit, inject, ElementRef, ViewChild} from '@angular/core';
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
import { TourService, TourData } from '../../../tours/services/tour.service'; 
import { AuthService } from '../../../../core/services/auth.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * Componente dedicado a la creación/edición de Tours.
 */
@Component({
  selector: 'app-tour-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario-tour.component.html',
  styleUrls: ['./formulario-tour.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TourFormComponent implements OnInit {
  tourForm!: FormGroup;
  nuevoItemForm!: FormGroup;
  enviado = false;
  enviando = false;
  mensajeExito = '';
  mensajeError = '';
  // 🆕 PROPIEDAD PARA ALMACENAR LA FECHA MÍNIMA (HOY)
  minDate: string; 

  private fb = inject(FormBuilder);
  private tourService = inject(TourService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // 🆕 Calculamos la fecha actual en formato YYYY-MM-DD al inicializar el componente.
    const today = new Date();
    // Usamos toISOString().split('T')[0] para asegurar el formato YYYY-MM-DD
    this.minDate = today.toISOString().split('T')[0]; 

    this.nuevoItemForm = this.fb.group({
      nombre: ['', Validators.required],
      icono: [''],
    });
  }

  ngOnInit(): void {
    this.crearFormulario();

  }

  // ================================================
  // 🏗️ Construcción del formulario
  // ================================================
  crearFormulario(): void {
    this.tourForm = this.fb.group({
      tour: this.fb.group({
        // Nombre: permitir letras, números, espacios, guiones y guion bajo (sin caracteres especiales)
        nombre: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-_]+$/)]],
        descripcion: ['', [Validators.required, Validators.minLength(10)]],
        direccion: ['', [Validators.required]],
        ciudad: ['', [Validators.required]], // ✅ Campo 1 para ubicación
        pais: ['', [Validators.required]],   // ✅ Campo 2 para ubicación
        precio: [0, [Validators.required, Validators.min(0)]],
        categoria: ['', [Validators.required]],
        duracion: [1, [Validators.required, Validators.min(1)]],
        imagen_url: ['', [Validators.required]],
        // Galería de imágenes dinámica
        imagenes: this.fb.array<FormGroup>([]),
        // Items dinámicos (cosas para llevar)
        items: this.fb.array<FormGroup>([]),
      }),
      // FormArray para salidas dinámicas
      salidas: this.fb.array([]),
    });
  }

  // ================================================
  // 🧾 Getters para acceder fácilmente a los campos
  // ================================================
  get tourGroup(): FormGroup {
    return this.tourForm.get('tour') as FormGroup;
  }

  get galeriaImagenes(): FormArray<FormGroup> {
    return this.tourGroup.get('imagenes') as FormArray<FormGroup>;
  }

  get items(): FormArray<FormGroup> {
    return this.tourGroup.get('items') as FormArray<FormGroup>;
  }

  get salidas(): FormArray {
    return this.tourForm.get('salidas') as FormArray;
  }

  // Getter para el control 'nombre' del grupo 'tour'
  get nombreControl(): FormControl {
    return this.tourGroup.get('nombre') as FormControl;
  }

  // Sanitiza el valor del nombre eliminando caracteres especiales no permitidos
  private sanitizeName(value: string): string {
    if (!value) return '';
    return value.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-_]/g, '');
  }

  onNombreInput(event: any): void {
    try {
      const raw = event?.target?.value ?? '';
      const sanitized = this.sanitizeName(raw);
      if (sanitized !== raw) {
        this.nombreControl.setValue(sanitized, { emitEvent: false });
      }
    } catch (e) {}
  }

  onNombrePaste(event: ClipboardEvent): void {
    if (!event) return;
    event.preventDefault();
    const text = (event.clipboardData || (window as any).clipboardData).getData('text') || '';
    const sanitized = this.sanitizeName(text);
    const current = this.nombreControl.value || '';
    this.nombreControl.setValue((current + sanitized).trim(), { emitEvent: false });
  }

  // Estado para saber si el input 'nombre' está enfocado
  nombreFocused = false;

  onNombreFocus(): void {
    this.nombreFocused = true;
  }

  onNombreBlur(): void {
    this.nombreFocused = false;
  }

  // ================================================
  // 🖼️ Galería de imágenes
  // ================================================
  agregarImagen(url: string, alt:string=''): void {
     const MAX_IMAGES = 5; // Definimos el límite máximo de imágenes
  
    // 1. Verificación de límite máximo
    if (this.galeriaImagenes.length >= MAX_IMAGES) {
      console.warn(`[GALERIA] Límite de ${MAX_IMAGES} imágenes alcanzado. No se agregará la URL.`);
      return;
    }
    
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
    this.galeriaImagenes.removeAt(index);
  }

  // ================================================
  // ➕/❌ Items (cosas para llevar)
  // ================================================
  // ✅ Lista de íconos Font Awesome a mostrar
  iconosFontAwesome: string[] = [
    'fa-solid fa-suitcase',          // Maleta
    'fa-solid fa-glasses',           // Gafas de sol
    'fa-solid fa-passport',          // Pasaporte
    'fa-solid fa-camera',            // Cámara
    'fa-solid fa-charging-station',  // Cargador / batería
    'fa-solid fa-headphones',        // Audífonos
    'fa-solid fa-tshirt',            // Ropa
    'fa-solid fa-umbrella-beach',    // Sombrilla / playa
    'fa-solid fa-bottle-droplet',    // Botella de agua
    'fa-solid fa-sun',               // Protector solar
    'fa-solid fa-shoe-prints',       // Zapatillas
    'fa-solid fa-map',               // Mapa
    'fa-solid fa-plane',             // Avión
    'fa-solid fa-ticket',            // Ticket / boleto
    'fa-solid fa-bed',               // Dormir / descanso
    'fa-solid fa-hat-cowboy',        // Sombrero
    'fa-solid fa-person-hiking',     // Excursionismo
    'fa-solid fa-compass',           // Brújula
    'fa-solid fa-binoculars',        // Binoculares
    'fa-solid fa-mountain',          // Montaña / aventura
    'fa-solid fa-swimmer',           // Ropa de baño
    'fa-solid fa-first-aid',         // Botiquín
    'fa-solid fa-book',              // Libro
    'fa-solid fa-wallet',            // Billetera
    'fa-solid fa-mobile-screen',     // Celular
    'fa-solid fa-laptop',            // Laptop
    'fa-solid fa-bottle-water',      // Hidratación
    'fa-solid fa-cookie-bite',       // Snacks
    'fa-solid fa-cloud-sun',         // Clima / abrigo
    'fa-solid fa-car',            // Cepillo (aseo)
  ];
  // Manejo del desplegable para elegir icono
  // 🔁 Reutilizamos los toggles
  mostrarEmojiPicker: boolean[] = [];  
  mostrarEmojiNuevo = false;

  toggleEmojiPicker(index: number): void {
    this.mostrarEmojiPicker[index] = !this.mostrarEmojiPicker[index];
  }
  toggleEmojiNuevo(): void {
    this.mostrarEmojiNuevo = !this.mostrarEmojiNuevo;
  }
  // ✅ Seleccionar ícono existente
  seleccionarIcono(icon: string, index: number): void {
    const items = this.tourForm.get('tour.items') as FormArray;
    const item = items.at(index);
    item.get('icono')?.setValue(icon);
    this.mostrarEmojiPicker[index] = false;
  }

  // ✅ Seleccionar ícono nuevo
  seleccionarIconoNuevo(icon: string): void {
    this.nuevoItemForm.get('icono')?.setValue(icon);
    this.mostrarEmojiNuevo = false;
  }

  agregarItem(): void {
    const MAX_ITEMS = 5; // ✅ Límite máximo de items

    if (this.nuevoItemForm.invalid) {
      return; // No hacer nada si el formulario del nuevo ítem es inválido
    }

    // ✅ Verificar límite máximo
    if (this.items.length >= MAX_ITEMS) {
      console.warn(`[ITEMS] Límite de ${MAX_ITEMS} items alcanzado. No se agregará más.`);
      return;
    }

    const { nombre, icono } = this.nuevoItemForm.value;

    // Creamos un nuevo FormGroup para el FormArray, asegurándonos de que tenga sus propios validadores.
    const itemGroup = this.fb.group({
      nombre: [nombre, [Validators.required]],
      icono: [icono]
    });

    this.items.push(itemGroup);
    this.nuevoItemForm.reset({ nombre: '', icono: '' }); // Limpiar el formulario del nuevo ítem
  }
  
  quitarItem(index: number): void {
    this.items.removeAt(index);
  }

  // ================================================
  // 🗓️ Gestión de salidas dinámicas
  // ================================================
  agregarSalida(): void {
    const salidaForm = this.fb.group({
      fecha: ['', [Validators.required]],
      hora: ['', [Validators.required]],
      cupo_total: [1, [Validators.required, Validators.min(1)]],
      cupo_reservado: [0, [Validators.required, Validators.min(0)]],
      estado: ['programada', [Validators.required]],
    });
    this.salidas.push(salidaForm);
  }

  eliminarSalida(index: number): void {
    this.salidas.removeAt(index);
  }

  // ================================================
  // 📤 Envío del formulario
  // ================================================
  onSubmit(): void {
    this.enviado = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    console.log('✅ Estado general:', this.tourForm.valid);
    console.log('🧱 Formulario completo:', this.tourForm.value);

    Object.keys(this.tourGroup.controls).forEach((key) => {
      const control = this.tourGroup.get(key);
      if (control?.invalid) {
        console.warn(`❌ Campo inválido: ${key}`, control.errors);
      }
    });

    console.log('📸 Imágenes:', this.galeriaImagenes.length);
    console.log('🎒 Items:', this.items.length);
    console.log('📅 Salidas:', this.salidas.length);

    // Mensaje específico si el nombre tiene caracteres inválidos
    if (this.nombreControl.invalid) {
      this.mensajeError = '❌ Nombre inválido: no se permiten caracteres especiales.';
      this.nombreControl.markAsTouched();
      const el = document.getElementById('mensajeError');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (this.tourForm.invalid) {
      // ⚠️ Si la aplicación seguía fallando, este era el punto de error:
      // 'ciudad' y 'pais' eran requeridos pero no tenían input en el HTML.
      this.mensajeError = '❌ Por favor, completa todos los campos requeridos correctamente.';
      this.tourForm.markAllAsTouched();
      // Scroll al mensaje
      const el = document.getElementById('mensajeError');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

      return;
    }

    // Validar que al menos exista una salida
    if (this.salidas.length === 0) {
      this.mensajeError = '⚠️ Debes registrar al menos una salida para el tour.';
      // Scroll al mensaje
      const el = document.getElementById('mensajeError');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return; // detener submit
    }

    const userRole = this.authService.getRole();
    if (userRole !== 'proveedor') {
      this.mensajeError = '🔒 Acceso denegado: Solo los proveedores pueden crear tours.';
      setTimeout(() => this.router.navigate(['/login']), 1500);
      return;
    }

    this.enviando = true;
    const tourData = this.tourGroup.getRawValue() as TourData;
    const salidasData = this.salidas.getRawValue();
    
    // Combinar los datos del tour con las salidas
    const payload = {
      ...tourData,
      imagenes: (tourData.imagenes??[]).map(img => ({
        url: img.url,
        alt: img.alt ?? undefined,
      })),
      items: (tourData.items ?? []).map(item => ({
        nombre: item.nombre,
        icono: item.icono ?? undefined,
      })),
      salidas: salidasData,
    };

    console.log('Formulario tour:', payload);

    this.tourService.createTour(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.mensajeExito = '✅ Tour registrado correctamente. Redirigiendo a tu panel...';
        setTimeout(() => this.router.navigate(['/proveedor']), 1500);
      },
      error: (error: any) => {
        this.enviando = false;
        let errorMessage = '❌ Error de conexión o servidor desconocido.';
        if (error && error.status) {
          if (error.status === 401 || error.status === 403) {
            errorMessage = '🔒 Acceso no autorizado. Por favor, vuelve a iniciar sesión.';
          } else if (error.status === 422 && error.error?.errors) {
            const validationErrors = error.error.errors;
            const firstErrorKey = Object.keys(validationErrors)[0];
            if (firstErrorKey && validationErrors[firstErrorKey].length > 0) {
              errorMessage = `❌ Error en '${firstErrorKey}': ${validationErrors[firstErrorKey][0]}`;
            }
          } else if (error.error?.message) {
            errorMessage = `❌ Error del servidor: ${error.error.message}`;
          }
        }
        this.mensajeError = errorMessage;
      },
    });
  }
}
