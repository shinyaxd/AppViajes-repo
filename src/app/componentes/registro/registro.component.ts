import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService, RegisterData } from '../paginas/hoteles/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  message = '';
  error = '';
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        apellido: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        rol: ['viajero', Validators.required]
      },
      // Aplicamos el validador al FormGroup
      { validators: this.passwordsIgualesValidator } 
    );
  }

  // Se cambia el tipo de entrada a FormGroup para mayor claridad en el validador
  private passwordsIgualesValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    // Si los controles no existen o no están listos, devolvemos null
    if (!password || !confirmPassword) {
      return null;
    }

    // 1. Limpiamos el error 'passwordMismatch' de confirmPassword
    // Siempre que se ejecute el validador, asumimos que puede limpiar el error si las contraseñas coinciden.
    if (confirmPassword.errors && confirmPassword.errors['passwordMismatch']) {
      const errors = { ...confirmPassword.errors };
      delete errors['passwordMismatch'];
      confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
    
    // 2. Si las contraseñas no coinciden, establecemos el error
    if (password.value !== confirmPassword.value) {
      // Establecer el error en el campo de confirmación
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      
      // Devolver el error al FormGroup
      return { passwordMismatch: true };
    } 
    
    // Si todo coincide y no hay errores a nivel de grupo
    return null; 
  };

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.message = '';
    this.error = '';

    // Agregamos un log para ver los errores reales antes de detener la ejecución
    if (this.registerForm.invalid) {
      console.log('--- ❌ FORMULARIO INVÁLIDO ---');
      console.log('Errores del FormGroup:', this.registerForm.errors);
      
      // Log de todos los errores de los controles individuales
      ['nombre', 'apellido', 'email', 'password', 'confirmPassword', 'rol'].forEach(controlName => {
        const control = this.registerForm.get(controlName);
        if (control && control.invalid) {
          console.log(`Errores en ${controlName}:`, control.errors);
          // 🛑 AÑADIDO: Log para ver el valor y si tiene el error de minlength
          if (controlName === 'password' && control.errors?.['minlength']) {
            console.warn(`⚠️ VALOR CAPTURADO DE PASSWORD: "${control.value}" (Longitud: ${control.value.length}). Se requiere un mínimo de 6 caracteres.`);
          }
        }
      });
      
      if (this.registerForm.hasError('passwordMismatch')) {
        this.error = '❌ Las contraseñas no coinciden.';
      } else {
        // Este mensaje se muestra si *cualquier* campo individual (nombre, email, etc.) falla su validación
        this.error = '❌ Por favor completa todos los campos correctamente o corrige los datos.';
      }
      return;
    }

    this.isSubmitting = true;

    // Ya no es necesario eliminar confirmPassword aquí si lo manejas en el validador/servicio,
    // pero mantenemos la sintaxis original de desestructuración.
    const { confirmPassword, ...formValue } = this.registerForm.getRawValue();
    const data: RegisterData = formValue as RegisterData;

    this.authService.register(data).subscribe({
      next: (res) => {
        this.message = res.message || '✅ Cuenta creada exitosamente.';
        this.error = '';
        this.isSubmitting = false;
        this.registerForm.reset({ rol: 'viajero' });

        console.log('Registro exitoso:', res);

        // Redirige después de 2 segundos
        setTimeout(() => this.router.navigate(['/hoteles']), 2000);
      },
      error: (err) => {
        console.error('Error en registro:', err);
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