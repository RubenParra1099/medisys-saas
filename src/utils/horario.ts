import type { DiaSemana, HorarioConfig } from '@/types';

/** Orden de despliegue habitual: lunes a domingo. */
const ORDEN_DISPLAY: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const ABREV_DIA: Record<DiaSemana, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

/**
 * Convierte el `horario_config` (JSON por día) en un resumen legible para
 * humanos, agrupando días consecutivos con el mismo horario.
 * Ej: { lunes..viernes: 09:00-18:00, sabado: 09:00-14:00 } -> "Lun–Vie 09:00–18:00, Sáb 09:00–14:00"
 */
export function resumenHorarioSemanal(horario?: HorarioConfig): string {
  if (!horario) return 'Horario no especificado';

  interface Grupo {
    inicio: string;
    fin: string;
    dias: DiaSemana[];
  }

  const grupos: Grupo[] = [];

  for (const dia of ORDEN_DISPLAY) {
    const info = horario[dia];
    if (!info?.activo) continue;

    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.inicio === info.inicio && ultimo.fin === info.fin) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ inicio: info.inicio, fin: info.fin, dias: [dia] });
    }
  }

  if (grupos.length === 0) return 'Sin horario configurado';

  return grupos
    .map((grupo) => {
      const etiquetaDias =
        grupo.dias.length > 1
          ? `${ABREV_DIA[grupo.dias[0]]}–${ABREV_DIA[grupo.dias[grupo.dias.length - 1]]}`
          : ABREV_DIA[grupo.dias[0]];
      return `${etiquetaDias} ${grupo.inicio}–${grupo.fin}`;
    })
    .join(', ');
}
