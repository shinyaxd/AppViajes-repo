import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Reserva } from '../models/reserva.model';
import { AuthService } from '../../core/services/auth.service';

/**
 * Servicio de reservas local por usuario. Las reservas se guardan en localStorage
 * usando la clave `mis_reservas_{userId}` para mantener separación entre usuarios.
 */
const STORAGE_PREFIX = 'mis_reservas_';

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private authService = inject(AuthService);

  private reservasSubject = new BehaviorSubject<Reserva[]>([]);
  public reservas$ = this.reservasSubject.asObservable();

  private currentUserId: number | null = null;

  constructor() {
    // Escuchar cambios de usuario para recargar las reservas del usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id ?? null;
      this.reservasSubject.next(this.loadFromStorageForUser(this.currentUserId));
    });

    // Helper global de pruebas: addReservaGlobal({ ... }) añade reserva al usuario actual
    try {
      (window as any).addReserva = (r: Partial<Reserva>) => {
        const toAdd: Reserva = {
          id: Date.now(),
          titulo: r.titulo || 'Reserva manual',
          fecha_inicio: r.fecha_inicio || undefined,
          fecha_fin: r.fecha_fin || undefined,
          total: r.total || 0,
          imagen: r.imagen || undefined,
          userId: this.currentUserId ?? undefined,
          estado: r.estado || 'confirmada',
          tags: r.tags || [],
          notas: r.notas || '',
          creadoEn: new Date().toISOString()
        };
        this.addReserva(toAdd);
        return toAdd;
      };
    } catch (e) {
      // ignore
    }
  }

  getMisReservas(): Observable<Reserva[]> {
    return this.reservas$;
  }

  addReserva(reserva: Reserva) {
    const userId = reserva.userId ?? this.currentUserId;
    const list = this.loadFromStorageForUser(userId);
    const next = [ { ...reserva, userId: userId ?? undefined }, ...list];
    this.saveToStorageForUser(userId, next);
    // Si añadimos para el usuario actual, emitimos nuevo estado
    if (userId === this.currentUserId) this.reservasSubject.next(next);
  }

  clearAllForCurrentUser() {
    this.saveToStorageForUser(this.currentUserId, []);
    this.reservasSubject.next([]);
  }

  private loadFromStorageForUser(userId: number | null): Reserva[] {
    try {
      const key = this.storageKeyFor(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw) as Reserva[];
    } catch (e) {
      console.warn('Error parsing reservas from storage', e);
      return [];
    }
  }

  private saveToStorageForUser(userId: number | null, list: Reserva[]) {
    try {
      const key = this.storageKeyFor(userId);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving reservas to storage', e);
    }
  }

  private storageKeyFor(userId: number | null) {
    return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
  }
}
