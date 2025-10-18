import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { environment } from '../../../../environments/environment';
// [ASUME QUE ESTE IMPORT APUNTA A TU SERVICIO REAL]
import { AuthService, User } from '../../../../app/core/services/auth.service'; // Importamos 'User' para tipado

// --- CONFIGURACIÓN DE API ---

/**
 * URL base de tu backend Laravel. En este caso, usa el prefijo de proxy configurado.
 */
const BASE_URL = environment.apiUrl;

/**
 * URL final para obtener el perfil (GET /api/auth/me).
 */
const API_GET_PROFILE_URL = `${BASE_URL}/auth/me`; 

/**
 * URL final para actualizar el perfil (PATCH /api/usuarios/me).
 */
const API_UPDATE_PROFILE_URL = `${BASE_URL}/usuarios/me`; 

/**
 * URL final para ELIMINAR el perfil (DELETE /api/usuarios/me).
 */
const API_DELETE_PROFILE_URL = `${BASE_URL}/usuarios/me`; 

/**
 * Validador personalizado para asegurar que la contraseña y la confirmación coincidan.
 */
function passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const password = control.get('password')?.value;
        const confirmPassword = control.get('confirmarPassword')?.value;

        // Solo valida si al menos un campo de contraseña tiene valor
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
    
    // Signals para manejar el estado reactivo
    currentUser = signal<any>(null); // Contendrá los datos reales cargados del backend
    currentRole = computed(() => this.currentUser()?.rol || 'viajero'); // Rol por defecto si no ha cargado
    isSaving = signal(false);
    isLoading = signal(true); // Controla el estado de carga inicial del perfil
    
    // Controla la visibilidad del modal de confirmación de eliminación
    showDeleteConfirmation = signal(false); 

    message = signal('');
    messageType = signal<'success' | 'error'>('success');
    
    rol: string = ''; 

    // Inyección de dependencias
    private authService = inject(AuthService); // Inyectamos el servicio
    
    constructor(private fb: FormBuilder, private router: Router) {}

    ngOnInit(): void {
        // Al iniciar, cargamos el perfil del backend
        this.cargarPerfil();
    }

    /**
     * Realiza la llamada GET al backend para obtener los datos del perfil del usuario autenticado.
     */
    async cargarPerfil(): Promise<void> {
        this.isLoading.set(true);
        this.message.set('');
        
        try {
            // ! CAMBIO CLAVE: Usamos el método del servicio para obtener el token
            const token = this.authService.getToken(); 
            
            if (!token) {
                console.warn('Cargar Perfil: TOKEN AUSENTE. Redirigiendo a /login.'); // LOG DE DIAGNÓSTICO
                this.router.navigate(['/login']);
                return;
            }

            console.log('Cargar Perfil: Token encontrado. Intentando obtener perfil...'); // LOG DE DIAGNÓSTICO
            
            const response = await fetch(API_GET_PROFILE_URL, {
                method: 'GET',
                headers: {
                    // Verificamos que el token se esté enviando correctamente en el encabezado
                    'Authorization': `Bearer ${token}` 
                },
            });

            if (!response.ok) {
                // Si la sesión expiró o es inválida (401), redirigir a login
                if (response.status === 401) {
                    console.error('Cargar Perfil: 401 UNAUTHORIZED. Sesión expirada o token inválido. Redirigiendo a /login.'); // LOG DE DIAGNÓSTICO
                    // Lógica para limpiar la sesión si es 401
                    this.authService.cleanSession(); 
                    this.router.navigate(['/login']); 
                } else {
                    // *** NUEVO LOG: Muestra el código de error si no es 401 o 200 ***
                    console.error(`Cargar Perfil: ERROR DE BACKEND. Código: ${response.status}. Mensaje: ${await response.text()}`);
                    this.messageType.set('error');
                    this.message.set(`Error al cargar el perfil. Código de respuesta del servidor: ${response.status}.`);
                }
                
                throw new Error(`Error al cargar el perfil. Código: ${response.status}`);
            }

            // *** CAMBIO CLAVE AQUÍ: Desempaquetar los datos de la clave 'data' ***
            const rawData = await response.json(); 
            const userData = rawData.data || rawData; // Usa rawData.data si existe, sino rawData (para robustez)

            // Si después de desempaquetar, el objeto sigue siendo inválido, lanzamos un error
            if (!userData || !userData.rol) {
                 console.error('Error de estructura: El objeto de usuario final no contiene la propiedad "rol". Estructura recibida:', userData);
                 throw new Error('Estructura de perfil recibida del servidor inválida.');
            }
            
            this.currentUser.set(userData);
            this.rol = userData.rol;
            this.buildForm(userData);

        } catch (error) {
            this.messageType.set('error');
            this.message.set('No se pudo cargar el perfil. Asegúrate de estar logueado o revisa la consola para ver el error de red/servidor.');
            console.error('Error general cargando el perfil (puede ser de red o del catch):', error);
            // Si falla la carga, inicializamos el formulario vacío para evitar errores de template
            this.buildForm({}); 
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Construye el formulario basado en el rol del usuario.
     */
    private buildForm(userData: any): void {
        const role = userData.rol;
        let formControls: { [key: string]: any } = {};

        // 1. Controles Comunes (Usamos valores seguros o vacíos si userData es null/vacío)
        formControls['nombre'] = [userData?.nombre || '', role === 'viajero' ? Validators.required : null];
        formControls['apellido'] = [userData?.apellido || '', role === 'viajero' ? Validators.required : null];
        formControls['email'] = [userData?.email || '', [Validators.required, Validators.email]];

        // 2. Controles de Contraseña
        formControls['password'] = [''];
        formControls['confirmarPassword'] = [''];

        // 3. Controles Específicos de Proveedor
        if (role === 'proveedor') {
            formControls['empresa_nombre'] = [userData?.empresa_nombre || '', Validators.required];
            formControls['telefono'] = [userData?.telefono || '', Validators.required];
            formControls['ruc'] = [userData?.ruc || '', Validators.required]; 
        }

        // Crear el FormGroup con el validador de coincidencia de contraseña
        this.form = this.fb.group(formControls, { 
            validators: passwordMatchValidator() 
        });

        // 4. Deshabilitar campos de solo lectura (email y ruc)
        this.form.get('email')?.disable();
        if (role === 'proveedor') {
            this.form.get('ruc')?.disable();
        }
    }

    /**
     * Maneja el envío del formulario, realizando la llamada PATCH al backend.
     */
    async guardarCambios(): Promise<void> {
        this.message.set('');
        
        // 1. Validar coincidencia de contraseña
        const passwordControl = this.form.get('password');
        const confirmControl = this.form.get('confirmarPassword');
        
        // El validador de grupo ya hace esto, pero lo mantenemos explícito para el mensaje de error.
        if (passwordControl?.value || confirmControl?.value) {
            if (this.form.hasError('passwordMismatch')) {
                this.messageType.set('error');
                this.message.set('La contraseña y su confirmación no coinciden.');
                return;
            }
        }

        // Habilitar temporalmente los campos deshabilitados para obtener sus valores (email, ruc)
        this.form.enable();

        if (this.form.invalid) {
            this.messageType.set('error');
            this.message.set('Por favor, complete todos los campos obligatorios o corrija los errores.');
            // Re-deshabilitar campos de solo lectura
            this.form.get('email')?.disable();
            if (this.currentRole() === 'proveedor') {
                this.form.get('ruc')?.disable();
            }
            return;
        }

        this.isSaving.set(true);

        // 2. Filtrar y preparar datos para el backend
        const originalData = this.currentUser();
        const formData = this.form.getRawValue(); 
        const payload: any = {};
        let changesMade = false;

        for (const key in formData) {
            // No enviar confirmación de contraseña, email ni ruc al backend (por ser campos no modificables o auxiliares)
            if (key === 'confirmarPassword' || key === 'email' || key === 'ruc') {
                continue;
            }
            
            // Solo enviar campos que han cambiado y no son la contraseña vacía
            // Nota: Si el usuario edita un campo y lo deja idéntico al original, no se envía.
            if (formData[key] !== originalData[key]) {
                 if (key === 'password' && formData[key] === '') {
                    continue; 
                 }
                payload[key] = formData[key];
                changesMade = true;
            }
        }
        
        // **Caso especial: Contraseña.** Si se llenó, se envía aunque no haya cambiado otro campo.
        if (passwordControl?.value && payload['password'] === undefined) {
            payload['password'] = passwordControl.value;
            changesMade = true;
        }

        // 3. Re-deshabilitar campos de solo lectura (Crucial antes de cualquier 'return' posterior)
        this.form.get('email')?.disable();
        if (this.currentRole() === 'proveedor') {
            this.form.get('ruc')?.disable();
        }

        if (!changesMade) {
            this.messageType.set('error');
            this.message.set('No hay campos modificados para actualizar.');
            this.isSaving.set(false);
            return;
        }
        
        // 4. Llamada al Backend (PATCH)
        try {
            // ! CAMBIO CLAVE: Usamos el método del servicio para obtener el token
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
                this.message.set('Cambios guardados correctamente.');

                // Actualizar el estado local (currentUser) y navegar
                const rawResponse = await response.json();
                // También esperamos que la respuesta del PATCH venga envuelta en 'data'
                const responseData = rawResponse.data || rawResponse; 
                
                // ===> LÓGICA DE ACTUALIZACIÓN CLAVE AQUÍ <===
                // 1. Notificar al AuthService que el usuario ha cambiado
                this.authService.updateUserInState(responseData as User); 
                
                // 2. Actualizar el estado local (la signal)
                const updatedUser = { ...this.currentUser(), ...responseData };
                this.currentUser.set(updatedUser);
                
                // Redirigir a la página principal después de un guardado exitoso
                setTimeout(() => {
                    this.router.navigate(['/']); 
                }, 500); 
            } else {
                // Manejar errores (ej. validación 422)
                const errorText = await response.text();
                // Intentamos extraer un mensaje de error legible
                let errorMessage = `Error al guardar: ${response.status}.`;
                try {
                    const errorData = JSON.parse(errorText);
                    // Suponiendo la estructura de error de Laravel (ValidationException)
                    const firstErrorKey = Object.keys(errorData.errors || {})[0];
                    if (firstErrorKey) {
                        errorMessage = errorData.errors[firstErrorKey][0];
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (e) {
                    errorMessage += ' Error desconocido del servidor o respuesta no JSON.';
                }
                
                this.messageType.set('error');
                this.message.set(errorMessage);
                console.error('Error del Backend:', response.status, JSON.parse(errorText || '{}'));
            }
        } catch (error) {
            this.messageType.set('error');
            this.message.set('Error de red. No se pudo conectar con el servidor.');
            console.error('Error de red/fetch:', error);
        } finally {
            this.isSaving.set(false);
            // Limpiar campos de contraseña siempre
            passwordControl?.setValue('');
            confirmControl?.setValue('');
        }
    }
    
    /**
     * Realiza la llamada DELETE para eliminar la cuenta del usuario.
     */
    async eliminarCuenta(): Promise<void> {
        this.message.set('');
        this.isSaving.set(true);
        
        try {
            const token = this.authService.getToken(); 
            
            const response = await fetch(API_DELETE_PROFILE_URL, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
            });

            if (response.ok || response.status === 204) { // 204 No Content es común para DELETE exitoso
                this.messageType.set('success');
                this.message.set('Tu cuenta ha sido eliminada. Redirigiendo...');
                
                // Limpiar la sesión local después de una eliminación exitosa
                this.authService.cleanSession(); 

                // Redirigir a la página de inicio de sesión o principal
                setTimeout(() => {
                    this.router.navigate(['/login']); 
                }, 1500); 
                
            } else if (response.status === 401) {
                // Si no está autorizado, limpiar sesión y redirigir
                this.authService.cleanSession();
                this.messageType.set('error');
                this.message.set('Sesión expirada. Por favor, inicia sesión de nuevo.');
                setTimeout(() => this.router.navigate(['/login']), 1500);
            } else {
                const errorText = await response.text();
                let errorMessage = `Error ${response.status} al eliminar la cuenta.`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.message) {
                        // El backend de Laravel responde con un mensaje de texto en 200/204
                        // por lo que este bloque es más probable para 4xx / 5xx.
                        errorMessage = errorData.message; 
                    }
                } catch (e) {
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
            // Ocultar el modal de confirmación
            this.showDeleteConfirmation.set(false); 
        }
    }
}
