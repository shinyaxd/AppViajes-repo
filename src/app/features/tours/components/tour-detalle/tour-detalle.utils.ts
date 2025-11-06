/**
 * Convierte una fecha ISO a Date ignorando la zona horaria.
 * Evita que Angular muestre un día anterior por efecto UTC.
 */
export function normalizarFecha(fechaISO: string): Date {
  if (!fechaISO) return new Date();

  // Tomamos solo la parte YYYY-MM-DD
  const soloFecha = fechaISO.split('T')[0]; // "2025-11-23"
  const partes = soloFecha.split('-').map(Number); // [2025, 11, 23]

  // Crear Date en zona local
  return new Date(partes[0], partes[1] - 1, partes[2]);
}
