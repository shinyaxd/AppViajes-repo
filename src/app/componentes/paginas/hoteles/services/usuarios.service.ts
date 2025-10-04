import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaz básica de usuario
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);

  // Listar todos los usuarios
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`/api/usuarios`);
  }

  // Crear usuario
  crearUsuario(data: Partial<Usuario>): Observable<any> {
    return this.http.post(`/api/usuarios`, data);
  }

  // Obtener usuario por ID
  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`/api/usuarios/${id}`);
  }

  // Actualizar usuario
  actualizarUsuario(id: number, data: Partial<Usuario>): Observable<any> {
    return this.http.put(`/api/usuarios/${id}`, data);
  }

  // Eliminar usuario
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`/api/usuarios/${id}`);
  }
}