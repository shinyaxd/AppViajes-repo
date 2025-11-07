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
        nombre: ['', [Validators.required]],
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
  // Manejo del desplegable para elegir icono
  mostrarEmojiPicker: boolean[] = []; // arreglo para manejar visibilidad por cada item
  toggleEmojiPicker(index: number): void {
    this.mostrarEmojiPicker[index] = !this.mostrarEmojiPicker[index];
  }
  seleccionarEmoji(event: any, index: number): void {
    const emoji = event.detail.unicode;
    const items = this.tourForm.get('tour.items') as FormArray;
    const item = items.at(index);
    item.get('icono')?.setValue(emoji);
    this.mostrarEmojiPicker[index] = false; // cerrar después de seleccionar
  }

  // Manejar el emoji nuevo (fijo)
  @ViewChild('nuevoIcono', { read: ElementRef }) nuevoIconoEl!: ElementRef<HTMLInputElement>;
  mostrarEmojiNuevo = false;

  toggleEmojiNuevo(): void {
    this.mostrarEmojiNuevo = !this.mostrarEmojiNuevo;
  }

  seleccionarEmojiNuevo(event: any):void {
    const emoji = event?.detail?.unicode ?? event?.detail?.unified ?? null;
    const input = document.querySelector<HTMLInputElement>('#nuevoIcono');
    if (!emoji) {
      console.warn('Emoji picker event sin unicode:', event);
      return;
    }
    // Escribir en el input directamente
    if (this.nuevoIconoEl?.nativeElement) {
      this.nuevoIconoEl.nativeElement.value = emoji;
    }
    this.mostrarEmojiNuevo = false;
  }

  agregarItem(nombre = '', icono = ''): void {
    const MAX_ITEMS = 5; // ✅ Límite máximo de items
    const items = this.tourForm.get('tour.items') as FormArray;
    // ✅ Verificar límite máximo
    if (items.length >= MAX_ITEMS) {
      console.warn(`[ITEMS] Límite de ${MAX_ITEMS} items alcanzado. No se agregará más.`);
      return;
    }
    // ✅ Validar que el nombre no esté vacío
    if (nombre && nombre.trim().length > 0) {
      const itemGroup = this.fb.group({
        nombre: [nombre, Validators.required],
        icono: [icono],
      });
      items.push(itemGroup);
      console.log(`[ITEMS] Item agregado (${items.length}/${MAX_ITEMS})`);
    } else {
      console.warn('[ITEMS] Nombre vacío — no se agregó item.');
    }
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
