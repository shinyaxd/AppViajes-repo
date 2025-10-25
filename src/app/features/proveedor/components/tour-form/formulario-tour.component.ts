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
import { TourService, TourData } from '../../../tours/services/tour.service'; 
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Componente dedicado a la creación/edición de Tours.
 */
@Component({
  selector: 'app-tour-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario-tour.component.html',
  styleUrls: ['../hotel-form/formulario.component.css'],
})
export class TourFormComponent implements OnInit {
  tourForm!: FormGroup;
  enviado = false;
  enviando = false;
  mensajeExito = '';
  mensajeError = '';

  private fb = inject(FormBuilder);
  private tourService = inject(TourService);
  private authService = inject(AuthService);
  private router = inject(Router);

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
        ciudad: ['', [Validators.required]],
        pais: ['', [Validators.required]],
        precio: [0, [Validators.required, Validators.min(0)]],
        ubicacion: ['', [Validators.required]],
        categoria: ['', [Validators.required]],
        duracion: [1, [Validators.required, Validators.min(1)]],
        fecha: ['', [Validators.required]],
        cupos: [1, [Validators.required, Validators.min(1)]],
        imagen_url: ['', [Validators.required]],
        // Galería de imágenes dinámica
        galeria_imagenes: this.fb.array<FormControl<string | null>>([]),
        // Cosas para llevar dinámico
        cosasParaLlevar: this.fb.array<FormControl<string | null>>([this.fb.control('', Validators.required)]),
      }),
    });
  }

  // ================================================
  // 🧾 Getters para acceder fácilmente a los campos
  // ================================================
  get tourGroup(): FormGroup {
    return this.tourForm.get('tour') as FormGroup;
  }

  get galeriaImagenes(): FormArray<FormControl<string | null>> {
    return this.tourGroup.get('galeria_imagenes') as FormArray<FormControl<string | null>>;
  }

  get cosasParaLlevar(): FormArray<FormControl<string | null>> {
    return this.tourGroup.get('cosasParaLlevar') as FormArray<FormControl<string |null>>;
  }

  // ================================================
  // 🖼️ Galería de imágenes
  // ================================================
  agregarImagen(url: string): void {
    if (url && url.trim().length > 0) {
      this.galeriaImagenes.push(this.fb.control(url, { validators: [Validators.required], nonNullable: true }));
    }
  }

  eliminarImagen(index: number): void {
    this.galeriaImagenes.removeAt(index);
  }

  // ================================================
  // ➕/❌ Cosas para llevar
  // ================================================
  agregarCosa(): void {
    this.cosasParaLlevar.push(this.fb.control('', Validators.required));
  }

  quitarCosa(index: number): void {
    if (this.cosasParaLlevar.length > 1) {
      this.cosasParaLlevar.removeAt(index);
    }
  }

  // ================================================
  // 📤 Envío del formulario
  // ================================================
  onSubmit(): void {
    this.enviado = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.tourForm.invalid) {
      this.mensajeError = '❌ Por favor, completa todos los campos requeridos correctamente.';
      this.tourForm.markAllAsTouched();
      return;
    }

    const userRole = this.authService.getRole();
    if (userRole !== 'proveedor') {
      this.mensajeError = '🔒 Acceso denegado: Solo los proveedores pueden crear tours.';
      setTimeout(() => this.router.navigate(['/login']), 1500);
      return;
    }

    this.enviando = true;
    const payload = this.tourGroup.getRawValue() as TourData;

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
