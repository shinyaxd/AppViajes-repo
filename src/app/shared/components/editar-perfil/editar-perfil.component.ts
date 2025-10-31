import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

// 🚨 CAMBIO CLAVE: Importamos HttpClient y HttpErrorResponse
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../../../app/core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SpinnerComponent } from '../ui/spinner/spinner.component';

// 🚨 CORRECCIÓN CLAVE: Importamos operadores de RxJS (AGREGAR concatMap y of)
import { catchError, map, finalize, switchMap, concatMap } from 'rxjs/operators'; 
import { throwError, of } from 'rxjs'; // 🚨 AGREGAR of

// 🚨 CORRECCIÓN DE RUTAS: Usando BASE_URL + /auth2/me (Asumimos que BASE_URL incluye /api)
const BASE_URL = environment.apiUrl;
const API_GET_PROFILE_URL = `${BASE_URL}/auth2/me`; // RUTA ACTUALIZADA
const API_UPDATE_PROFILE_URL = `${BASE_URL}/usuarios/me`; // Se mantiene la ruta de recursos
const API_DELETE_PROFILE_URL = `${BASE_URL}/usuarios/me`; // Se mantiene la ruta de recursos

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
  // Asegúrate de que HttpClientModule esté provisto en tu app.config.ts
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
  // 🚨 CAMBIO CLAVE: Inyectamos HttpClient
  private http = inject(HttpClient); 

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  // 🚨 CAMBIO CLAVE: Refactorizado de async/await (fetch) a Observables (HttpClient)
  cargarPerfil(): void {
    this.loadingService.show('Cargando datos del perfil...');
    this.message.set('');

    // Usamos HttpClient.get. El Interceptor agrega cookies.
    this.http.get<{ data: User }>(API_GET_PROFILE_URL).pipe(
      // Mapeamos la respuesta para obtener solo el objeto User (res.data)
      map(response => response.data), 
      // Manejamos errores (incluyendo el 401 que indica sesión expirada)
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('Cargar Perfil: Sesión expirada (401). Redirigiendo...');
          this.authService.cleanSession();
          this.router.navigate(['/auth/login']);
        } else {
          console.error(`Cargar Perfil: ERROR ${error.status}:`, error);
          this.messageType.set('error');
          this.message.set(`Error al cargar el perfil. Código: ${error.status}.`);
        }
        // Construimos un formulario vacío si hay error
        this.buildForm({});
        return throwError(() => new Error('Error al cargar el perfil.')); 
      }),
      // Ocultamos el spinner al finalizar (éxito o error)
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
        // La lógica de error y UI ya se manejó en el pipe
        console.error('Error general cargando el perfil (Observable):', err);
      }
    });
  }

  /** Construye el formulario con controles ya deshabilitados según rol (evita el warning de Angular). */
  private buildForm(userData: any): void {
    const role = userData?.rol ?? 'viajero';
    const isProveedor = role === 'proveedor';
    const telefonoPattern = /^\+51\s?9\d{8}$/; // Patrón para validar teléfono

    const emailCtrl = this.fb.control(
      { value: userData?.email ?? '', disabled: true },
      [Validators.required, Validators.email]
    );

    const nombreCtrl = this.fb.control(
      { value: userData?.nombre ?? '', disabled: isProveedor },
      isProveedor ? [] : [Validators.required]
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

    // RUC en solo-lectura para proveedor
    const rucCtrl = this.fb.control(
      { value: userData?.ruc ?? '', disabled: !isProveedor || true },
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

  // 🚨 CAMBIO CLAVE: Ahora incluye REFRESH y CSRF antes del PATCH
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
    const raw = this.form.getRawValue();

    const payload: any = {};
    let changesMade = false;

    // Lógica para construir y comparar el payload (se mantiene)
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
        // Si el refresh falla con 401, el token de refresh también expiró.
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.warn('Refresh falló. Sesión completamente expirada.');
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            return throwError(() => new Error('Sesión completamente expirada.'));
          }
          // Si es otro error o si refresh no es necesario, continuamos.
          return of(null); 
        })
      )),
      // 2. Obtener el CSRF token
      concatMap(() => this.authService.getCsrfToken()),
      
      // 3. Encadenar la petición PATCH
      switchMap(() => {
        // Usamos HttpClient.patch(). El Interceptor adjuntará el X-XSRF-TOKEN
        return this.http.patch<{ data: User }>(API_UPDATE_PROFILE_URL, payload);
      }),
      // Manejo de errores
      catchError((error: HttpErrorResponse) => {
        let errorMessage = `Error al guardar: ${error.status}.`;
        
        // Manejo específico del 401 que puede ocurrir si el token expiró después del refresh
        if (error.status === 401) {
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            errorMessage = 'Sesión expirada durante la operación de guardado. Reintente el login.';
        }
        
        // Lógica de extracción de errores (se mantiene)
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
        // 🚨 CAMBIO: Obtenemos el usuario actualizado de 'res.data'
        const updatedUser = res.data;

        this.messageType.set('success');
        this.message.set('Cambios guardados correctamente. Redirigiendo...');

        this.authService.updateUserInState(updatedUser);
        this.currentUser.set(updatedUser);
        
        // Lógica de redirección (se mantiene)
        const rolActualizado = updatedUser.rol || 'viajero';
        let rutaRedireccion = rolActualizado === 'proveedor' ? '/proveedor' : '/hoteles';
        setTimeout(() => this.router.navigate([rutaRedireccion]), 500);
      },
      error: () => {
        // El error ya fue manejado en el catchError
      }
    });
  }

  // 🚨 CAMBIO CLAVE: Ahora incluye REFRESH y CSRF antes del DELETE
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
        // Si el refresh falla con 401, el token de refresh también expiró.
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.warn('Refresh falló. Sesión completamente expirada.');
            this.authService.cleanSession();
            this.router.navigate(['/auth/login']);
            return throwError(() => new Error('Sesión completamente expirada.'));
          }
          // Si es otro error, continuamos.
          return of(null); 
        })
      )),
      // 2. Obtener el CSRF token
      concatMap(() => this.authService.getCsrfToken()),
      
      // 3. Encadenar la petición DELETE
      switchMap(() => {
        // Usamos HttpClient.delete(). El Interceptor adjuntará el X-XSRF-TOKEN
        return this.http.delete(API_DELETE_PROFILE_URL);
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = `Error ${error.status} al eliminar la cuenta.`;

        if (error.status === 401) {
          this.authService.cleanSession();
          errorMessage = 'Sesión expirada. Por favor, inicia sesión de nuevo.';
          // Redirige
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