import type { Cita } from '@/types';

export interface ResumenAgenda {
  /** Todas las citas (cualquier estatus) cuya fecha cae en el mes/año de `ahora`. */
  totalCitasMes: number;
  /** Citas con estatus "Pendiente", sin filtrar por mes: el médico debe verlas todas. */
  citasPendientes: number;
  /** citas Confirmadas del mes × tarifa de consulta del médico. */
  ingresosEstimadosMes: number;
}

function esDelMismoMes(fechaISO: string, anio: number, mes: number): boolean {
  const [anioCita, mesCita] = fechaISO.split('-').map(Number);
  return anioCita === anio && mesCita - 1 === mes;
}

/**
 * Calcula el resumen ejecutivo de la Agenda Médica a partir de las citas del
 * médico y su tarifa de consulta (`medico.precio_consulta`).
 */
export function calcularResumenAgenda(citas: Cita[], tarifaConsulta: number, ahora: Date = new Date()): ResumenAgenda {
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth();

  const citasDelMes = citas.filter((cita) => esDelMismoMes(cita.fecha, anioActual, mesActual));
  const confirmadasDelMes = citasDelMes.filter((cita) => cita.estatus === 'Confirmada');
  const pendientes = citas.filter((cita) => cita.estatus === 'Pendiente');

  return {
    totalCitasMes: citasDelMes.length,
    citasPendientes: pendientes.length,
    ingresosEstimadosMes: confirmadasDelMes.length * tarifaConsulta,
  };
}
