import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SpinnerComponent } from '../ui';
import { catchError, map, finalize, switchMap, concatMap } from 'rxjs/operators'; 
import { throwError, of } from 'rxjs'; 

const BASE_URL = environment.apiUrl;
// Rutas de API
// CORREGIDO: De '/auth2/me' a '/auth/me' según tu backend
const API_GET_PROFILE_URL = `${BASE_URL}/auth/me`; 
const API_UPDATE_PROFILE_URL = `${BASE_URL}/usuarios/me`; 
const API_DELETE_PROFILE_URL = `${BASE_URL}/usuarios/me`; 

/** Validador para asegurar que password y confirmarPassword coincidan, solo si al menos uno tiene valor. */
function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmarPassword')?.value;
    if (password || confirmPassword) {
      return password === confirmPassword ? null : { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-editar-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent], 
  templateUrl: './editar-perfil.component.html',
  styleUrls: ['./editar-perfil.component.css']
})
export class EditarPerfilComponent implements OnInit {
  form!: FormGroup;

  currentUser = signal<any>(null);
  currentRole = computed(() => this.currentUser()?.rol || 'viajero');
  isSaving = signal(false);

  showDeleteConfirmation = signal(false);

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  rol: string = '';

  private authService = inject(AuthService);
  loadingService = inject(LoadingService);
  private http = inject(HttpClient); 

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  /**
   * Carga los datos del perfil del usuario autenticado.
   */
  cargarPerfil(): void {
    this.loadingService.show('Cargando datos del perfil...');
    this.message.set('');

    this.http.get<{ data: User }>(API_GET_PROFILE_URL).pipe(
      map(response => response.data), 
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('Cargar Perfil: Sesión expirada (401). Redirigiendo...');
          this.authService.cleanSession();
          this.router.navigate(['/auth/login']);
        } else {
          // Si el error 500 persiste, sigue siendo un problema del controlador en el backend
          console.error(`Cargar Perfil: ERROR ${error.status}:`, error);
          this.messageType.set('error');
          this.message.set(`Error al cargar el perfil. Código: ${error.status}.`);
        }
        this.buildForm({});
        return throwError(() => new Error('Error al cargar el perfil.')); 
      }),
      finalize(() => this.loadingService.hide()) 
    ).subscribe({
      next: (userData) => {
        if (!userData || !userData.rol) {
          console.error('Estructura inválida de perfil:', userData);
          this.messageType.set('error');
          this.message.set('Estructura de perfil inválida.');
          this.buildForm({});
          return;
        }

        this.currentUser.set(userData);
        this.rol = userData.rol;
        this.buildForm(userData);
      },
      error: (err) => {
        console.error('Error general cargando el perfil (Observable):', err);
      }
    });
  }

  /** Construye el formulario con controles ya deshabilitados según rol. */
  private buildForm(userData: any): void {
    const role = userData?.rol ?? 'viajero';
    const isProveedor = role === 'proveedor';
    const telefonoPattern = /^\+51\s?9\d{8}$/;
    // Permitir letras (incluye acentos) y espacios únicamente
    const nombrePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;

    const emailCtrl = this.fb.control(
      { value: userData?.email ?? '', disabled: true },
      [Validators.required, Validators.email]
    );

    const nombreCtrl = this.fb.control(
      { value: userData?.nombre ?? '', disabled: isProveedor },
      isProveedor ? [] : [Validators.required, Validators.pattern(nombrePattern)]
    );

    const apellidoCtrl = this.fb.control(
      { value: userData?.apellido ?? '', disabled: isProveedor },
      isProveedor ? [] : [Validators.required]
    );

    const empresaCtrl = this.fb.control(
      { value: userData?.empresa_nombre ?? '', disabled: !isProveedor },
      isProveedor ? [Validators.required] : []
    );

    const telefonoCtrl = this.fb.control(
      { value: userData?.telefono ?? '', disabled: !isProveedor },
      isProveedor ? [Validators.required, Validators.pattern(telefonoPattern)] : []
    );

    // RUC en solo-lectura: siempre deshabilitado para edición
    const rucCtrl = this.fb.control(
      { value: userData?.ruc ?? '', disabled: true }, 
      []
    );

    const passwordCtrl = this.fb.control('');
    const confirmarPasswordCtrl = this.fb.control('');

    this.form = this.fb.group(
      {
        email: emailCtrl,
        nombre: nombreCtrl,
        apellido: apellidoCtrl,
        empresa_nombre: empresaCtrl,
        telefono: telefonoCtrl,
        ruc: rucCtrl,
        password: passwordCtrl,
        confirmarPassword: confirmarPasswordCtrl
      },
      { validators: passwordMatchValidator() }
    );
  }

  togglePassword(): void {
    this.showPassword.update(state => !state);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(state => !state);
  }

  /**
   * Envía los cambios del perfil. Utiliza Refresh + CSRF + PATCH.
   */
  guardarCambios(): void {
    this.message.set('');

    const passwordControl = this.form.get('password');
    const confirmControl = this.form.get('confirmarPassword');

    if (passwordControl?.value || confirmControl?.value) {
      if (this.form.hasError('passwordMismatch')) {
        this.messageType.set('error');
        this.message.set('La contraseña y su confirmación no coinciden.');
        return;
      }
    }

    if (this.form.invalid) {
      this.messageType.set('error');
      this.message.set('Por favor, complete los campos obligatorios o corrija los errores.');
      return;
    }

    this.loadingService.show('Guardando cambios...');
    this.isSaving.set(true);

    const originalData = this.currentUser();
    // Usamos getRawValue para obtener también los campos deshabilitados (como RUC, aunque no se envían)
    const raw = this.form.getRawValue();

    const payload: any = {};
    let changesMade = false;

    // Lógica para construir y comparar el payload
    for (const [key, value] of Object.entries(raw)) {
      if (key === 'confirmarPassword' || key === 'email' || key === 'ruc') continue;

      const v = typeof value === 'string' ? value.trim() : value;
      if (key === 'password' && !v) continue;

      const original = (originalData as any)?.[key];
      const originalTrim = typeof original === 'string' ? original?.trim?.() : original;

      if (v !== undefined && v !== null && v !== '' && v !== originalTrim) {
        payload[key] = v;
        changesMade = true;
      }
    }

    // Asegurar que la contraseña se incluya si se llenó
    if (passwordControl?.value && !payload['password']) {
      const p = passwordControl.value.trim();
      if (p) {
        payload['password'] = p;
        changesMade = true;
      }
    }

    if (!changesMade) {
      this.messageType.set('error');
      this.message.set('No hay campos modificados para actualizar.');
      this.isSaving.set(false);
      this.loadingService.hide();
      return;
    }
    
    // ==========================================================
    // INICIO DE LA CADENA DE OPERACIONES SEGURAS (Refresh + CSRF + PATCH)
    // ==========================================================
    of(null).pipe(
      // 1. Refresh Token: Intentar renovar el JWT ANTES de la operación
      concatMap(() => this.authService.refresh().pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.warn('Refresh falló. Sesión completamente expirada.');
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            return throwError(() => new Error('Sesión completamente expirada.'));
          }
          return of(null); 
        })
      )),
      // 2. Obtener el CSRF token
      concatMap(() => this.authService.getCsrfToken()),
      
      // 3. Encadenar la petición PATCH
      switchMap(() => {
        return this.http.patch<{ data: User }>(API_UPDATE_PROFILE_URL, payload);
      }),
      // Manejo de errores
      catchError((error: HttpErrorResponse) => {
        let errorMessage = `Error al guardar: ${error.status}.`;
        
        if (error.status === 401) {
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            errorMessage = 'Sesión expirada durante la operación de guardado. Reintente el login.';
        }
        
        if (error.error?.errors) {
            const firstErrorKey = Object.keys(error.error.errors)[0];
            if (firstErrorKey) {
                errorMessage = error.error.errors[firstErrorKey][0];
            }
        } else if (error.error?.message) {
            errorMessage = error.error.message;
        }

        this.messageType.set('error');
        this.message.set(errorMessage);
        console.error('Error de Backend (PATCH):', error);
        
        return throwError(() => new Error(errorMessage));
      }),
      // Limpieza y estado al finalizar (éxito o error)
      finalize(() => {
        passwordControl?.setValue('');
        confirmControl?.setValue('');
        this.isSaving.set(false);
        this.loadingService.hide();
      })
    ).subscribe({
      next: (res) => {
        const updatedUser = res.data;

        this.messageType.set('success');
        this.message.set('Cambios guardados correctamente. Redirigiendo...');

        this.authService.updateUserInState(updatedUser);
        this.currentUser.set(updatedUser);
        
        const rolActualizado = updatedUser.rol || 'viajero';
        let rutaRedireccion = rolActualizado === 'proveedor' ? '/proveedor' : '/hoteles';
        setTimeout(() => this.router.navigate([rutaRedireccion]), 500);
      },
      error: () => {
        // Error manejado en catchError
      }
    });
  }

  /**
   * Elimina la cuenta de usuario. Utiliza Refresh + CSRF + DELETE.
   */
  eliminarCuenta(): void {
    this.message.set('');
    this.loadingService.show('Eliminando cuenta...');
    this.isSaving.set(true);

    // ==========================================================
    // INICIO DE LA CADENA DE OPERACIONES SEGURAS (Refresh + CSRF + DELETE)
    // ==========================================================
    of(null).pipe(
      // 1. Refresh Token: Intentar renovar el JWT ANTES de la operación
      concatMap(() => this.authService.refresh().pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.warn('Refresh falló. Sesión completamente expirada.');
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            return throwError(() => new Error('Sesión completamente expirada.'));
          }
          return of(null); 
        })
      )),
      // 2. Obtener el CSRF token
      concatMap(() => this.authService.getCsrfToken()),
      
      // 3. Encadenar la petición DELETE
      switchMap(() => {
        return this.http.delete(API_DELETE_PROFILE_URL);
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = `Error ${error.status} al eliminar la cuenta.`;

        if (error.status === 401) {
          this.authService.cleanSession();
          errorMessage = 'Sesión expirada. Por favor, inicia sesión de nuevo.';
          setTimeout(() => this.router.navigate(['/auth/login']), 1500);
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.messageType.set('error');
        this.message.set(errorMessage);
        console.error('Error DELETE Backend:', error);
        
        return throwError(() => new Error(errorMessage));
      }),
      // Limpieza y estado al finalizar (éxito o error)
      finalize(() => {
        this.isSaving.set(false);
        this.loadingService.hide();
        this.showDeleteConfirmation.set(false);
      })
    ).subscribe({
      next: () => {
        this.messageType.set('success');
        this.message.set('Tu cuenta ha sido eliminada. Redirigiendo...');
        this.authService.cleanSession();
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: () => {
        // Error manejado en catchError
      }
    });
  }
}