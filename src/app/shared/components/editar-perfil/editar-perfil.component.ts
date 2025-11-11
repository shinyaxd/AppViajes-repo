import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

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
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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

  editMode: { [key: string]: boolean } = {
    nombre: false,
    apellido: false,
    celular: false,
    direccion: false,
    fecha_cumpleanos: false
  };

  activeTab = signal<'cuenta' | 'historial' | 'metodos_pago'>('cuenta');

  // Nuevas propiedades para imágenes (puro frontend)
  profileImage = signal<string>('');
  coverImage = signal<string>('');
  profileImageFile = signal<File | null>(null);
  coverImageFile = signal<File | null>(null);

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    // Datos mock para puro frontend
    const mockUserData = {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@email.com',
      celular: '+1234567890',
      direccion: 'Calle Principal 123',
      fecha_cumpleanos: '1990-01-01',
      rol: 'viajero',
      foto_perfil: '',
      foto_portada: ''
    };

    this.currentUser.set(mockUserData);
    this.rol = mockUserData.rol;
    this.buildForm(mockUserData);

    // Cargar imágenes si existen (en este caso vacías)
    this.profileImage.set(mockUserData.foto_perfil || '');
    this.coverImage.set(mockUserData.foto_portada || '');
  }

  private buildForm(userData: any): void {
    this.form = this.fb.group({
      nombre: [userData?.nombre || '', Validators.required],
      apellido: [userData?.apellido || '', Validators.required],
      email: [{ value: userData?.email || '', disabled: true }, [Validators.required, Validators.email]],
      celular: [userData?.celular || ''],
      direccion: [userData?.direccion || ''],
      fecha_cumpleanos: [userData?.fecha_cumpleanos || ''],
      password: [''],
      confirmarPassword: ['']
    }, { validators: passwordMatchValidator() });
  }

  togglePassword(): void {
    this.showPassword.update(state => !state);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(state => !state);
  }

  triggerFileInput(elementId: string): void {
    document.getElementById(elementId)?.click();
  }

  // Nuevos métodos para manejo de imágenes (puro frontend)
  onProfileImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.profileImageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onCoverImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.coverImageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeProfileImage(): void {
    this.profileImage.set('');
    this.profileImageFile.set(null);
  }

  removeCoverImage(): void {
    this.coverImage.set('');
    this.coverImageFile.set(null);
  }

  guardarCambios(): void {
    this.message.set('');

    if (this.form.invalid) {
      this.messageType.set('error');
      this.message.set('Por favor, complete los campos obligatorios o corrija los errores.');
      return;
    }

    // Simulación de guardado (puro frontend)
    this.isSaving.set(true);

    // Simular delay de guardado
    setTimeout(() => {
      this.messageType.set('success');
      this.message.set('Cambios guardados correctamente.');

      // Actualizar datos locales
      const updatedUser = {
        ...this.currentUser(),
        ...this.form.getRawValue()
      };
      this.currentUser.set(updatedUser);

      // Limpiar archivos después de guardar
      this.profileImageFile.set(null);
      this.coverImageFile.set(null);

      this.isSaving.set(false);
    }, 1000);
  }

  eliminarCuenta(): void {
    this.message.set('');
    this.showDeleteConfirmation.set(false);

    // Simulación de eliminación (puro frontend)
    this.messageType.set('success');
    this.message.set('Cuenta eliminada correctamente (simulación).');

    // En un escenario real, aquí iría la redirección
    // this.router.navigate(['/auth/login']);
  }
}
