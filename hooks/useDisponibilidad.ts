'use client';

// TODO: implementar cuando exista GET /api/booking/disponibilidad.
// Debe recibir idMedico + fecha y devolver los horarios (HH:mm) disponibles,
// con estados de loading/error consistentes con useReservarCita.ts.
export function useDisponibilidad(_idMedico: string, _fecha: string) {
  return { horarios: [] as string[], cargando: false, error: null as string | null };
}
