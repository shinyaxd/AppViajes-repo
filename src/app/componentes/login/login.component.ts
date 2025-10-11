import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
// Asumiendo que has actualizado LoginCredentials en auth.service.ts para ser opcional
import { AuthService, LoginCredentials } from '../paginas/hoteles/services/auth.service'; 

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
      // ✅ CORRECCIÓN: Se añade el control 'rememberMe' que faltaba en el FormGroup
      rememberMe: [false] 
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
    
    // Al obtener los valores, Angular incluirá 'rememberMe', aunque tu API probablemente lo ignore.
    const formValue = this.loginForm.getRawValue();
    
    // Creamos los credenciales solo con email y password, tal como espera tu servicio.
    // Si la API espera 'rememberMe', tendrías que incluirlo en LoginCredentials.
    const data: LoginCredentials = {
        email: formValue.email,
        password: formValue.password
    };

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

        // Usamos el valor de rememberMe del formulario para el reset
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