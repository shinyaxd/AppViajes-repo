import { Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { 
  FormBuilder, 
  Validators, 
  ReactiveFormsModule, 
  FormGroup, 
  AbstractControl, 
  ValidationErrors, 
  ValidatorFn,
  FormControl, 
} from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
// Importamos RegisterResponse y User para manejar la respuesta del servidor (éxito/mensaje)
import { AuthService, RegisterData, RegisterResponse, User } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit, OnDestroy {
  // Se utiliza inyección moderna (inject) para ser consistente
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  
  message = '';
  error = '';
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  private roleSubscription!: Subscription;

  // Se eliminan los parámetros del constructor y se usa inject
  constructor() {} 

  ngOnInit(): void {
    // Inicializar formulario con campos de viajero por defecto
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        rol: ['viajero', Validators.required],
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        apellido: ['', [Validators.required, Validators.maxLength(100)]],
      },
      { validators: this.passwordsIgualesValidator }
    );

    // Escuchar cambios del rol
    const rolControl = this.registerForm.get('rol');
    if (rolControl) {
      this.roleSubscription = rolControl.valueChanges.subscribe(rol => {
        this.toggleRoleFields(rol);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) this.roleSubscription.unsubscribe();
  }

  /**
   * Cambia dinámicamente los campos según el rol
   */
  toggleRoleFields(rol: string): void {
    const travelerFields = ['nombre', 'apellido'];
    const providerFields = ['empresa_nombre', 'telefono', 'ruc'];

    if (rol === 'viajero') {
      // Eliminar campos de proveedor
      providerFields.forEach(field => {
        if (this.registerForm.contains(field)) {
          this.registerForm.removeControl(field);
        }
      });

      // Agregar campos de viajero
      travelerFields.forEach(field => {
        if (!this.registerForm.contains(field)) {
          this.registerForm.addControl(field, this.fb.control('', [Validators.required, Validators.maxLength(100)]));
        }
      });
    } else if (rol === 'proveedor') {
      // Eliminar campos de viajero
      travelerFields.forEach(field => {
        if (this.registerForm.contains(field)) {
          this.registerForm.removeControl(field);
        }
      });

      // Agregar campos de proveedor
      providerFields.forEach(field => {
        if (!this.registerForm.contains(field)) {
          let control: FormControl;
          if (field === 'empresa_nombre') {
            control = this.fb.control('', [Validators.required, Validators.maxLength(150)]);
          } else if (field === 'telefono') {
            control = this.fb.control('', [
              Validators.required,
              Validators.pattern(/^\+51\s?9\d{8}$/),
              Validators.maxLength(15)
            ]);
          } else { // ruc
            control = this.fb.control('', [
              Validators.required,
              Validators.pattern(/^\d{11}$/),
              Validators.maxLength(11)
            ]);
          }
          this.registerForm.addControl(field, control);
        }
      });
    }

    this.registerForm.updateValueAndValidity();
  }

  /**
   * Validador de contraseñas iguales
   */
  private passwordsIgualesValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      // Se corrige para no mutar el objeto de errores directamente, sino extenderlo
      const errors = { ...(confirmPassword.errors || {}), passwordMismatch: true };
      confirmPassword.setErrors(errors);
      return { passwordMismatch: true };
    }

    // Si coinciden, limpia solo el error de passwordMismatch si está presente
    if (confirmPassword.errors && confirmPassword.errors['passwordMismatch']) {
      const errors = { ...confirmPassword.errors };
      delete errors['passwordMismatch'];
      confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
    }

    return null;
  };

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    this.message = '';
    this.error = '';

    if (this.registerForm.invalid) {
      this.error = this.registerForm.hasError('passwordMismatch')
        ? '❌ Las contraseñas no coinciden.'
        : '❌ Completa todos los campos correctamente.';
      // Asegurar que se muestren los errores de validación en el template
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const { confirmPassword, ...formValue } = this.registerForm.getRawValue();
    const data: RegisterData = formValue as RegisterData;

    this.authService.register(data).subscribe({
      next: (res: RegisterResponse) => { 
        // 🚨 LÓGICA DE AUTOLOGIN CORREGIDA
        // El AuthService ya guardó el usuario y la cookie JWT. 
        // Solo necesitamos obtener el usuario para la redirección.
        const user = res.data?.user;

        if (user) {
          this.message = '✅ Registro y sesión iniciada exitosamente.';
          console.log('Registro exitoso. Autologin OK. Usuario:', user.email, 'Rol:', user.rol);
          
          const userRole = user.rol;
          let redirectPath = '/';

          // 1. Determinar ruta basada en el rol
          if (userRole === 'proveedor') {
            redirectPath = '/proveedor';
          } else if (userRole === 'viajero') {
            redirectPath = '/hoteles';
          }
          
          // 2. Redirigir al usuario
          setTimeout(() => this.router.navigate([redirectPath]), 400);

        } else {
          // Fallback: Si el backend no devuelve el usuario (estado no deseado)
          this.message = res.message || '✅ Registro exitoso. Ahora puedes iniciar sesión.';
          setTimeout(() => this.router.navigate(['/auth/login']), 1000);
        }

        this.isSubmitting = false;
        // Reiniciar el formulario, manteniendo el rol seleccionado
        this.registerForm.reset({ rol: data.rol });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = err?.message || '❌ Ocurrió un error durante el registro.';
      }
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.registerForm.get(campo);
    // Agregamos el chequeo de "dirty" para mejor UX
    return !!(control && control.invalid && (control.dirty || control.touched)); 
  }
}