/**
 * Barrel file para componentes UI reutilizables
 * Facilita la importación de componentes compartidos
 */

// Exportamos los COMPONENTES (valores)
export { BannerComponent } from './banner/banner.component';
export { CardListComponent } from './card-list/card-list.component';
export { CardGridComponent } from './card-grid/card-grid.component';
export { SpinnerComponent } from './spinner/spinner.component';

// Exportamos los TIPOS/INTERFACES de datos (usando 'export type')
export type { CardListItem } from './card-list/card-list.component';
export type { CardGridItem } from './card-grid/card-grid.component';