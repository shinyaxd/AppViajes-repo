import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginCredentials } from '../paginas/hoteles/services/auth.service'; // Ruta correcta

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
      password: ['', Validators.required]
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
    const data: LoginCredentials = this.loginForm.getRawValue() as LoginCredentials;

    this.authService.login(data).subscribe({
      next: (res) => {
        this.message = res.message || '✅ Sesión iniciada exitosamente.';
        this.isSubmitting = false;

        console.log('Login exitoso. Usuario:', res.user.email, 'Rol:', res.user.rol);

        // ==========================================================
        // ✅ LÓGICA DE REDIRECCIÓN SEGÚN EL ROL
        // ==========================================================
        const userRole = res.user.rol;

        // 🧠 Guardamos el rol explícitamente (por si el AuthService no lo hizo aún)
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

        this.loginForm.reset();
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
