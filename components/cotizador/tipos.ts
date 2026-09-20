import type { ItemPresupuesto } from '@/types';

/**
 * Copia cliente-seguro de la lógica del Cotizador de Presupuestos.
 *
 * `calcularTotalPresupuesto` es una copia IDÉNTICA de la función del mismo
 * nombre en `src/utils/presupuestosRepository.ts` (la fuente de verdad real,
 * usada del lado del servidor). Se duplica aquí a propósito — mismo criterio
 * ya usado con `formatearMoneda` en `components/documentos/tipos.ts` — porque
 * `presupuestosRepository.ts` importa `googleSheets.ts`, que a su vez importa
 * `googleapis`; ese paquete no es compatible con el bundle de un componente
 * `'use client'`. Esta copia solo sirve para la VISTA PREVIA en vivo mientras
 * el dentista arma el presupuesto — el total que realmente se guarda en
 * Google Sheets siempre lo recalcula el servidor, nunca se confía en este.
 *
 * Si se modifica la fórmula, hay que actualizar ambas copias.
 */
export function calcularTotalPresupuesto(items: ItemPresupuesto[], descuento: number): number {
  const subtotal = items.reduce((acumulado, item) => acumulado + item.costoUnitario * item.cantidad, 0);
  return Math.max(0, subtotal - descuento);
}

/** Ej: `formatearMoneda(1700)` → "$1,700.00 MXN". Misma convención que `components/documentos/tipos.ts`. */
export function formatearMoneda(valor: number): string {
  const formateado = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
  return `${formateado} MXN`;
}

/** Sugerencias rápidas de tratamientos comunes — solo autocompletado, el campo sigue siendo texto libre. */
export const TRATAMIENTOS_SUGERIDOS = [
  'Limpieza dental',
  'Resina',
  'Endodoncia',
  'Extracción',
  'Corona',
  'Blanqueamiento',
  'Ortodoncia (ajuste)',
  'Consulta / Revisión',
] as const;

/** Fila en blanco para "Agregar Tratamiento" en el constructor de presupuestos. */
export function crearItemVacio(): ItemPresupuesto {
  return { tratamiento: '', diente: '', costoUnitario: 0, cantidad: 1 };
}

/** Estilos del badge de estatus del presupuesto: Borrador en ámbar, Aceptado en verde. */
export const ESTILOS_ESTATUS_PRESUPUESTO: Record<'Borrador' | 'Aceptado', string> = {
  Borrador: 'bg-amber-50 text-amber-600 border border-amber-100',
  Aceptado: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};
