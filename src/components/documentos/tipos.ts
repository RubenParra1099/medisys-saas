import type { MovimientoFinanciero, TipoMovimientoFinanciero } from '@/types';

/**
 * Resumen ejecutivo calculado a partir de TODOS los movimientos financieros
 * de un paciente — nunca del resultado de un filtro/búsqueda en el cliente,
 * para que los 3 KPIs siempre reflejen el estado real y completo de la
 * cuenta (mismo criterio que `KpisPacientes.tsx`).
 */
export interface ResumenFinanciero {
  totalPresupuestado: number;
  totalAbonado: number;
  /** `totalPresupuestado - totalAbonado`. Puede ser negativo si el paciente pagó de más. */
  saldoPendiente: number;
}

/**
 * Recorre el historial financiero de un paciente y acumula los 3 totales
 * del módulo. Es una función pura (sin dependencias de React/Next.js) a
 * propósito, para poder verificarla de forma aislada con un script de Node
 * antes de confiar en ella dentro de la UI.
 */
export function calcularResumenFinanciero(movimientos: MovimientoFinanciero[]): ResumenFinanciero {
  let totalPresupuestado = 0;
  let totalAbonado = 0;

  for (const movimiento of movimientos) {
    if (movimiento.tipo === 'Abono') {
      totalAbonado += movimiento.monto;
    } else {
      totalPresupuestado += movimiento.monto;
    }
  }

  return {
    totalPresupuestado,
    totalAbonado,
    saldoPendiente: totalPresupuestado - totalAbonado,
  };
}

/** Estilos del badge de la tabla de movimientos: Abono en verde, Presupuesto en azul. */
export const ESTILOS_TIPO_MOVIMIENTO: Record<TipoMovimientoFinanciero, string> = {
  Presupuesto: 'bg-blue-50 text-blue-600 border border-blue-100',
  Abono: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

/**
 * Ej: `formatearMoneda(1700)` → "$1,700.00 MXN". Misma convención exacta que
 * `ResumenAgendaCards.tsx` — se duplica aquí (en vez de importarla) porque
 * ese componente vive fuera de `components/documentos/` y no exporta la
 * función; ambas implementaciones deben mantenerse idénticas si se toca una.
 */
export function formatearMoneda(valor: number): string {
  const formateado = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
  return `${formateado} MXN`;
}
