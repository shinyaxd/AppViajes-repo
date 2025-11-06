import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
// Asumiendo que has actualizado LoginCredentials en auth.service.ts para ser opcional
import { AuthService, LoginCredentials } from '../../../../core/services/auth.service'; 


const EMAIL_STORAGE_KEY = 'remembered_email';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], 
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})


export class LoginComponent implements OnInit {
  message = '';
  error = '';
  loginForm!: FormGroup;
  showPassword = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Intenta recuperar el email guardado
    const rememberedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);

    this.loginForm = this.fb.group({
      // 2. Carga el email guardado si existe, sino usa un string vacío.
      email: [rememberedEmail || '', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      // 3. Marca 'rememberMe' si se encontró un email guardado.
      rememberMe: [!!rememberedEmail]
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.message = '';
    this.error = '';

    if (this.loginForm.invalid) {
      this.error = '❌ Por favor, ingresa tu correo y contraseña.';
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    
    const formValue = this.loginForm.getRawValue();
  
    const data: LoginCredentials = {
        email: formValue.email,
        password: formValue.password
    };

    this.authService.login(data).subscribe({
      next: (res) => {
        // --- CAMBIOS AQUÍ ---
        // 1. Obtener el usuario desde 'res.data.user' (nuevo formato de AuthResponse)
        const user = res.data.user; 
        
        this.message = res.message || '✅ Sesión iniciada exitosamente.';
        this.isSubmitting = false;

        console.log('Login exitoso. Usuario:', user.email, 'Rol:', user.rol);

        // ==========================================================
        // ✅ LÓGICA DE RECORDAR CORREO (LOCALSTORAGE)
        // ==========================================================
        if (formValue.rememberMe) {
            // Guardar el email en localStorage
            localStorage.setItem(EMAIL_STORAGE_KEY, formValue.email);
        } else {
            // Eliminar el email de localStorage si no se marcó "Recuérdame"
            localStorage.removeItem(EMAIL_STORAGE_KEY);
        }

        // ==========================================================
        // ✅ LÓGICA DE REDIRECCIÓN SEGÚN EL ROL
        // ==========================================================
        const userRole = user.rol; // Usamos la variable 'user' local

        // El AuthService ya maneja el almacenamiento del rol, pero lo mantenemos como fallback
        if (userRole) {
          localStorage.setItem('user_role', userRole);
        }

        let redirectPath = '/';
        if (userRole === 'proveedor') {
          redirectPath = '/proveedor';
        } else if (userRole === 'viajero') {
          redirectPath = '/hoteles';
        }

        // Redirigimos después de un pequeño delay
        setTimeout(() => {
          this.router.navigate([redirectPath]);
        }, 400);

        // Usamos el valor de rememberMe del formulario para el reset
        this.loginForm.reset({ rememberMe: formValue.rememberMe }); 
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.isSubmitting = false;
        // El handleError en AuthService garantiza que 'err' tiene una propiedad 'message'
        this.error = err.message || '❌ Error desconocido al iniciar sesión.'; 
      }
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.loginForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}