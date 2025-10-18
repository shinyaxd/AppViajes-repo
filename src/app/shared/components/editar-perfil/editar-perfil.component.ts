import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService, User } from '../../../../app/core/services/auth.service';

const BASE_URL = environment.apiUrl;
const API_GET_PROFILE_URL = `${BASE_URL}/auth/me`;
const API_UPDATE_PROFILE_URL = `${BASE_URL}/usuarios/me`;
const API_DELETE_PROFILE_URL = `${BASE_URL}/usuarios/me`;

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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-perfil.component.html',
  styleUrls: ['./editar-perfil.component.css']
})
export class EditarPerfilComponent implements OnInit {
  form!: FormGroup;

  currentUser = signal<any>(null);
  currentRole = computed(() => this.currentUser()?.rol || 'viajero');
  isSaving = signal(false);
  isLoading = signal(true);

  showDeleteConfirmation = signal(false);

  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  rol: string = '';

  private authService = inject(AuthService);

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  async cargarPerfil(): Promise<void> {
    this.isLoading.set(true);
    this.message.set('');

    try {
      const token = this.authService.getToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      const response = await fetch(API_GET_PROFILE_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.authService.cleanSession();
          this.router.navigate(['/login']);
        } else {
          console.error(`Cargar Perfil: ERROR ${response.status}: ${await response.text()}`);
          this.messageType.set('error');
          this.message.set(`Error al cargar el perfil. Código: ${response.status}.`);
        }
        throw new Error(`Error al cargar el perfil. Código: ${response.status}`);
      }

      const rawData = await response.json();
      const userData = rawData.data || rawData;

      if (!userData || !userData.rol) {
        console.error('Estructura inválida de perfil:', userData);
        throw new Error('Estructura de perfil inválida.');
      }

      this.currentUser.set(userData);
      this.rol = userData.rol;
      this.buildForm(userData);

    } catch (error) {
      this.messageType.set('error');
      this.message.set('No se pudo cargar el perfil.');
      console.error('Error general cargando el perfil:', error);
      this.buildForm({});
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Construye el formulario con controles ya deshabilitados según rol (evita el warning de Angular). */
  private buildForm(userData: any): void {
    const role = userData?.rol ?? 'viajero';
    const isProveedor = role === 'proveedor';
    const telefonoPattern = /^\+51\s?9\d{8}$/; // igual que backend

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

  async guardarCambios(): Promise<void> {
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

    // NO habilitamos el formulario; usamos getRawValue() y filtramos campos
    if (this.form.invalid) {
      this.messageType.set('error');
      this.message.set('Por favor, complete los campos obligatorios o corrija los errores.');
      return;
    }

    this.isSaving.set(true);

    const originalData = this.currentUser();
    const raw = this.form.getRawValue();

    const payload: any = {};
    let changesMade = false;

    for (const [key, value] of Object.entries(raw)) {
      // No enviar confirmación, email ni ruc
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

    // Si se ingresó password, envíala aunque no haya otros cambios
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
      return;
    }

    try {
      const token = this.authService.getToken();

      const response = await fetch(API_UPDATE_PROFILE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.messageType.set('success');
        this.message.set('Cambios guardados correctamente. Redirigiendo...');

        const rawResponse = await response.json();
        const responseData = rawResponse.data || rawResponse;

        this.authService.updateUserInState(responseData as User);

        const updatedUser = { ...this.currentUser(), ...responseData };
        this.currentUser.set(updatedUser);
        
        // **********************************************
        // ******* INICIO: CAMBIO EN LA REDIRECCIÓN *******
        // **********************************************
        const rolActualizado = updatedUser.rol || 'viajero';
        let rutaRedireccion = '/';

        if (rolActualizado === 'proveedor') {
          // Si es proveedor, redirigir a su dashboard (ajusta esta ruta si es diferente)
          rutaRedireccion = '/proveedor'; 
        } else {
          // Si es viajero, redirigir a la vista de hoteles (ajusta esta ruta si es diferente)
          rutaRedireccion = '/hoteles'; 
        }

        setTimeout(() => this.router.navigate([rutaRedireccion]), 500);
        // **********************************************
        // ******* FIN: CAMBIO EN LA REDIRECCIÓN **********
        // **********************************************
      } else {
        const errorText = await response.text();
        let errorMessage = `Error al guardar: ${response.status}.`;
        try {
          const errorData = JSON.parse(errorText);
          const firstErrorKey = Object.keys(errorData.errors || {})[0];
          if (firstErrorKey) {
            errorMessage = errorData.errors[firstErrorKey][0];
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          errorMessage += ' Error desconocido del servidor o respuesta no JSON.';
        }

        this.messageType.set('error');
        this.message.set(errorMessage);
        console.error('Error del Backend:', response.status, errorText);
      }
    } catch (error) {
      this.messageType.set('error');
      this.message.set('Error de red. No se pudo conectar con el servidor.');
      console.error('Error de red/fetch:', error);
    } finally {
      this.isSaving.set(false);
      passwordControl?.setValue('');
      confirmControl?.setValue('');
    }
  }

  async eliminarCuenta(): Promise<void> {
    this.message.set('');
    this.isSaving.set(true);

    try {
      const token = this.authService.getToken();

      const response = await fetch(API_DELETE_PROFILE_URL, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok || response.status === 204) {
        this.messageType.set('success');
        this.message.set('Tu cuenta ha sido eliminada. Redirigiendo...');
        this.authService.cleanSession();
        setTimeout(() => this.router.navigate(['/login']), 1500);
      } else if (response.status === 401) {
        this.authService.cleanSession();
        this.messageType.set('error');
        this.message.set('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      } else {
        const errorText = await response.text();
        let errorMessage = `Error ${response.status} al eliminar la cuenta.`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          errorMessage += ' Error de servidor desconocido.';
        }
        this.messageType.set('error');
        this.message.set(errorMessage);
        console.error('Error DELETE Backend:', response.status, errorText);
      }
    } catch (error) {
      this.messageType.set('error');
      this.message.set('Error de red. No se pudo conectar con el servidor para eliminar la cuenta.');
      console.error('Error de red/fetch DELETE:', error);
    } finally {
      this.isSaving.set(false);
      this.showDeleteConfirmation.set(false);
    }
  }
}