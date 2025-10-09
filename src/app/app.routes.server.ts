import { RenderMode, ServerRoute } from '@angular/ssr';

// Para rutas con parámetros (por ejemplo detallesHotel/:servicio_id y detallesTour/:servicio_id)
// no usamos Prerender ya que requiere getPrerenderParams; usamos Universal para render en servidor sin prerender.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
