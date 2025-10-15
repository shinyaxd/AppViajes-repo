/**
 * Modelo de Tour
 * Representa un tour o experiencia turística
 */
export interface TourData {
  id?: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  precio: number;
  ubicacion: string;
  categoria: 'Aventura' | 'Gastronomía' | 'Cultura' | 'Relajación';
  duracion: number;
  fecha: string;
  cupos: number;
  imagen_url: string;
  galeria_imagenes: string[];
  cosasParaLlevar: string[];
}

/**
 * Categorías disponibles para tours
 */
export type TourCategoria = 'Aventura' | 'Gastronomía' | 'Cultura' | 'Relajación';
