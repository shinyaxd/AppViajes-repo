import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginCredentials, AuthResponse, User } from '../../../../core/services/auth.service'; 
import { switchMap } from 'rxjs/operators';

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
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false] 
    });
    
    // Pre-cargar el CSRF Token al cargar el componente
    this.authService.getCSRFToken().subscribe({
      next: () => console.log('✅ CSRF Token de seguridad inicial cargado.'),
      error: (err) => console.error('❌ Error al cargar el CSRF Token inicial:', err)
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
    
    // 1. Obtener/actualizar CSRF Token
    this.authService.getCSRFToken().pipe(
      // 2. Encadenar con la llamada de login
      switchMap(() => this.authService.login(data))
      
    ).subscribe({
      next: (res: AuthResponse) => {
        this.message = res.message || '✅ Sesión iniciada exitosamente.';
        this.isSubmitting = false;

        // 🟢 CORRECCIÓN FINAL: Accedemos al usuario vía res.data.user
        const user: User = res.data.user;
        if (!user) {
            this.error = '❌ Login exitoso, pero faltan datos del usuario en la respuesta.';
            return;
        }

        console.log('Login exitoso. Usuario:', user.email, 'Rol:', user.rol);

        // ==========================================================
        // ✅ LÓGICA DE REDIRECCIÓN SEGÚN EL ROL
        // ==========================================================
        const userRole = user.rol;

        if (userRole) {
          localStorage.setItem('user_role', userRole);
        }

        let redirectPath = '/';
        if (userRole === 'proveedor') {
          redirectPath = '/proveedor';
        } else if (userRole === 'viajero') {
          redirectPath = '/hoteles';
        }

        setTimeout(() => {
          this.router.navigate([redirectPath]);
        }, 400);

        this.loginForm.reset({ rememberMe: formValue.rememberMe }); 
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.isSubmitting = false;
        this.error = err.message || '❌ Error desconocido al iniciar sesión.'; 
      }
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.loginForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
