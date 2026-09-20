/**
 * Utilidades de fecha compartidas por el formulario de captura de pacientes
 * y por el módulo de Odontograma IA (para sugerir dentición adulta/infantil
 * a partir de la fecha de nacimiento de un paciente real).
 */

/** Calcula la edad en años completos a partir de una fecha "YYYY-MM-DD". Devuelve `null` si la fecha no es válida. */
export function calcularEdad(fechaNacimientoIso: string): number | null {
  const fecha = new Date(`${fechaNacimientoIso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();

  const aunNoCumpleEsteAño =
    hoy.getMonth() < fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate());
  if (aunNoCumpleEsteAño) edad -= 1;

  return edad >= 0 ? edad : null;
}

/**
 * Umbral clínico simple para sugerir el tipo de dentición de un paciente
 * real al abrir su odontograma: a los 12 años la mayoría de las piezas
 * permanentes ya erupcionaron. Es solo una sugerencia inicial — el
 * dentista siempre puede cambiar el selector "Dentición Adulta/Infantil"
 * manualmente dentro del módulo.
 */
const EDAD_MINIMA_DENTICION_ADULTA = 12;

export function sugerirDenticionPorEdad(edad: number | null): 'adulta' | 'infantil' {
  if (edad === null) return 'adulta';
  return edad < EDAD_MINIMA_DENTICION_ADULTA ? 'infantil' : 'adulta';
}
