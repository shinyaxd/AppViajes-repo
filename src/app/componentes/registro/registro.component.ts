import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  FormBuilder, 
  Validators, 
  ReactiveFormsModule, 
  FormGroup, 
  AbstractControl, 
  ValidationErrors, 
  ValidatorFn,
  FormControl 
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterData } from '../paginas/hoteles/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit, OnDestroy {
  message = '';
  error = '';
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  private roleSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

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
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    }

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
      return;
    }

    this.isSubmitting = true;

    const { confirmPassword, ...formValue } = this.registerForm.getRawValue();
    const data: RegisterData = formValue as RegisterData;

    this.authService.register(data).subscribe({
      next: (res) => {
        this.message = res.message || '✅ Cuenta creada exitosamente.';
        this.isSubmitting = false;
        this.registerForm.reset({ rol: data.rol });
        setTimeout(() => this.router.navigate(['/hoteles']), 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = err?.message || '❌ Ocurrió un error durante el registro.';
      }
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.registerForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched)); 
  }
}
