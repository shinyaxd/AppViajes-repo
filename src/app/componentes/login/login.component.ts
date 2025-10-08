import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginCredentials } from '../paginas/hoteles/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  // Aseguramos la importación de RouterLink para el enlace a registro en el HTML
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
    // Inicializa el formulario con solo email y password, ambos requeridos
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
      return;
    }

    this.isSubmitting = true;

    // Obtenemos los datos del formulario (LoginCredentials)
    const data: LoginCredentials = this.loginForm.getRawValue() as LoginCredentials;

    // Llama al método login del AuthService
    this.authService.login(data).subscribe({
      next: (res) => {
        this.message = res.message || '✅ Sesión iniciada exitosamente.';
        this.error = '';
        this.isSubmitting = false;
        this.loginForm.reset();

        console.log('Login exitoso. Token almacenado.', res);

        // Redirige al usuario a la página principal (hoteles)
        setTimeout(() => this.router.navigate(['/hoteles']), 1000);
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.isSubmitting = false;
        // El error viene del throwError que configuramos en AuthService
        this.error = err.message || '❌ Error desconocido al iniciar sesión.'; 
      }
    });
  }

  /**
   * Verifica si un campo debe mostrar el indicador de error.
   * @param campo Nombre del control de formulario.
   * @returns true si el campo es inválido y ha sido tocado/modificado.
   */
  campoInvalido(campo: string): boolean {
    const control = this.loginForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}