// src/app/services/usuarios.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  created_at?: string;
  updated_at?: string;
}

interface UsuarioApiRespuesta {
  data: Usuario | Usuario[];
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:8000/api/usuarios';

  /**
   * 📋 Listar todos los usuarios
   */
  getUsuarios(): Observable<Usuario[]> {
    return this.http
      .get<UsuarioApiRespuesta>(this.API_URL)
      .pipe(map(res => res.data as Usuario[]));
  }

  /**
   * ➕ Crear usuario
   */
  crearUsuario(data: Partial<Usuario>): Observable<Usuario> {
    return this.http
      .post<UsuarioApiRespuesta>(this.API_URL, data)
      .pipe(map(res => res.data as Usuario));
  }

  /**
   * 🔍 Obtener usuario por ID
   */
  getUsuario(id: number): Observable<Usuario> {
    return this.http
      .get<UsuarioApiRespuesta>(`${this.API_URL}/${id}`)
      .pipe(map(res => res.data as Usuario));
  }

  /**
   * ✏️ Actualizar usuario
   */
  actualizarUsuario(id: number, data: Partial<Usuario>): Observable<Usuario> {
    return this.http
      .put<UsuarioApiRespuesta>(`${this.API_URL}/${id}`, data)
      .pipe(map(res => res.data as Usuario));
  }

  /**
   * 🗑️ Eliminar usuario
   */
  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
