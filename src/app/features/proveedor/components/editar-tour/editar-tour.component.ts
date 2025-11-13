import { Component, OnInit, inject} from '@angular/core';
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
import { TourService, TourData, TourDetalleApiResponse, TourDetalles} from '../../../tours/services/tour.service'; 
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * Componente dedicado a la creación/edición de Tours.
 */
interface SalidaData {
  fecha: string;
  hora: string;
  cupo_total: number;
  cupo_reservado: number;
  estado: string;
}

@Component({
  selector: 'app-editar-tour',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-tour.component.html',
  styleUrls: ['./editar-tour.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EditarTourComponent implements OnInit {
  tourId: number | null = null;
  cargandoDatos: boolean = true;
  tourForm!: FormGroup;
  nuevoItemForm!: FormGroup;
  // 🆕 Propiedad para almacenar el ID del tour a editar
  enviado = false;
  enviando = false;
  mensajeExito = '';
  mensajeError = '';
  // 🆕 PROPIEDAD PARA ALMACENAR LA FECHA MÍNIMA (HOY)
  minDate: string; 

  private route = inject(ActivatedRoute);
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
    this.route.paramMap.subscribe({
      next: (params: ParamMap) => {
        const idString = params.get('id'); // 'id' debe coincidir con el nombre de tu ruta: 'editar-tour/:id'
        
        if (idString) {
          // El '+' convierte el string del parámetro a número (number)
          this.tourId = +idString; 
          console.log('ID del Tour extraído:', this.tourId);
          
          // 3. Llamar a la función de carga
          this.cargarDatosTour(this.tourId);
          
        } else {
          console.error('No se encontró el ID del tour en la ruta.');
          // Manejar la falta de ID (ej. redireccionar o mostrar error)
        }
      },
      error: (err) => {
        console.error('Error al leer los parámetros de la ruta:', err);
      }
    });
  }

  // ================================================
  // 🏗️ Construcción del formulario
  // ================================================
  crearFormulario(): void {
    this.tourForm = this.fb.group({
      tour: this.fb.group({
        nombre: ['', [Validators.required]],
        descripcion: ['', [Validators.required, Validators.minLength(10)]],
        //direccion: ['', [Validators.required]], No hay dirección en tours
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
  // Cargar datos 
  // ================================================
  cargarDatosTour(id: number): void {
    this.cargandoDatos = true;
    // 2. Llamar al servicio para obtener los datos
    this.tourService.getTourById(id).subscribe({
      next: (data: TourDetalles) => {
        console.log('Datos del Tour cargados:', data);

        // 3. Precargar el formulario principal (Tour Group)
        this.tourForm.patchValue({
          tour: {
            nombre: data.nombre,
            descripcion: data.descripcion,
            ciudad: data.ciudad,
            pais: data.pais,
            precio: data.tour?.precio,
            categoria: data.tour?.categoria,
            duracion: data.tour?.duracion,
            imagen_url: data.imagen_url,
          }
        });
        const tourItems = data.tour?.items;
        // 4. Precargar FormArray: Items (Cosas para llevar)
        if (tourItems && tourItems.length>0) {
          this.items.clear();

          tourItems.forEach((item) => { 
            this.items.push(this.fb.group({
              nombre: [item.nombre, Validators.required],
              icono: [item.icono || ''], 
            }));
          });
        }

        // 5. Precargar FormArray: Galería de Imágenes
        data.imagenes?.forEach((img) => { 
          this.galeriaImagenes.push(this.fb.group({
            url: [img.url || img.imagen_url, Validators.required], // Usar 'url' o 'imagen_url'
            alt: [''] // No hay campo 'alt' en tu interfaz, se deja vacío.
          }));
        });

        // 6. Precargar FormArray: Salidas
        data.salidas?.forEach((salida: SalidaData) => {
          this.salidas.push(this.fb.group({
            fecha: [salida.fecha.split('T')[0], Validators.required], // Limpiar el formato ISO para el input date
            hora: [salida.hora, Validators.required],
            cupo_total: [salida.cupo_total, [Validators.required, Validators.min(1)]],
            cupo_reservado: [salida.cupo_reservado, [Validators.required, Validators.min(0)]],
            estado: [salida.estado, Validators.required],
          }));
        });
        this.cargandoDatos = false; // Desactivar la carga
        
      },
      error: (error) => {
        this.mensajeError = '❌ Error al cargar los datos del tour: ' + (error.error?.message || 'Desconocido');
        console.error('Error de carga:', error);
      }
    });
  }
  // ================================================
  // 📤 Envío del formulario
  // ================================================
  onSubmit(): void {
    this.enviado = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    // 1. Verificar si tenemos el ID del tour a editar
    if (!this.tourId){
      this.mensajeError = '❌ Error interno: ID del tour no encontrado para actualizar.';
      console.error('El ID del tour (this.tourId) es null o undefined.');
      return;
    }
    // Verificar que envio al backend
    console.log('✅ Estado general:', this.tourForm.valid);
    console.log('🧱 Formulario completo:', this.tourForm.value);
    // Verificar campos
    Object.keys(this.tourGroup.controls).forEach((key) => {
      const control = this.tourGroup.get(key);
      if (control?.invalid) {
        console.warn(`❌ Campo inválido: ${key}`, control.errors);
      }
    });

    if (this.tourForm.invalid) {
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
    // ==================================================================
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

    console.log('Payload de ACTUALIZACIÓN para tour:', payload);

    this.tourService.updateTour(this.tourId, payload).subscribe({
      next: () => {
        this.enviando = false;
        this.mensajeExito = '✅ Tour ID ${this.tourId} actualizado con éxito. Redirigiendo a tu panel...';
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
