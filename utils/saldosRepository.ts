import { agregarFila, leerRango } from '@/utils/googleSheets';
import type { CrearMovimientoFinancieroInput, MovimientoFinanciero, TipoMovimientoFinanciero } from '@/types';

/**
 * Acceso de dominio a la pestaña "Saldos" — Cotizador de Presupuestos y
 * Control de Abonos.
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Saldos" con estos encabezados en la Fila 1,
 * en este orden exacto:
 *
 *   id_transaccion | id_paciente | id_medico | fecha | concepto | tipo | monto | notas
 */

const RANGO_SALDOS = 'Saldos!A2:H';
// Índices dentro de cada fila del rango anterior (A=0, B=1, ...).
const INDICE_ID_TRANSACCION = 0;
const INDICE_ID_PACIENTE = 1;
const INDICE_ID_MEDICO = 2;
const INDICE_FECHA = 3;
const INDICE_CONCEPTO = 4;
const INDICE_TIPO = 5;
const INDICE_MONTO = 6;
const INDICE_NOTAS = 7;

const PREFIJO_ID_TRANSACCION = 'TX-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

/**
 * Convierte el valor crudo de la columna `tipo` a `TipoMovimientoFinanciero`,
 * cayendo en `'Presupuesto'` para cualquier valor corrupto o inesperado —
 * nunca se debe lanzar un error solo por leer una fila con datos sucios (ver
 * el mismo criterio defensivo aplicado en `odontogramaRepository.ts`).
 */
function saneaTipoMovimiento(valor: string): TipoMovimientoFinanciero {
  const normalizado = valor.trim();
  return normalizado === 'Abono' ? 'Abono' : 'Presupuesto';
}

/** Convierte el valor crudo de la columna `monto` a número, cayendo en 0 si no es numérico. */
function saneaMonto(valor: string): number {
  const numero = Number.parseFloat(valor.trim());
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function filaAMovimiento(fila: string[]): MovimientoFinanciero {
  return {
    id_transaccion: (fila[INDICE_ID_TRANSACCION] ?? '').trim(),
    id_paciente: (fila[INDICE_ID_PACIENTE] ?? '').trim(),
    id_medico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
    fecha: (fila[INDICE_FECHA] ?? '').trim(),
    concepto: (fila[INDICE_CONCEPTO] ?? '').trim(),
    tipo: saneaTipoMovimiento(fila[INDICE_TIPO] ?? ''),
    monto: saneaMonto(fila[INDICE_MONTO] ?? ''),
    notas: (fila[INDICE_NOTAS] ?? '').trim(),
  };
}

/**
 * Genera un `id_transaccion` con formato "TX-12345" (5 dígitos) que no
 * colisione con ninguno ya existente en la hoja — mismo patrón
 * colisión-verificada que `generarIdPacienteUnico` en `pacientesRepository.ts`.
 */
async function generarIdTransaccionUnico(): Promise<string> {
  const filas = await leerRango(RANGO_SALDOS);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_TRANSACCION] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_TRANSACCION}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(
    `[saldosRepository] No fue posible generar un id_transaccion único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`,
  );
}

/**
 * Inserta un nuevo movimiento financiero (cargo por tratamiento o abono) al
 * final de la pestaña "Saldos" y devuelve el registro completo ya creado.
 */
export async function crearMovimientoFinanciero(
  input: CrearMovimientoFinancieroInput,
  idMedico: string,
): Promise<MovimientoFinanciero> {
  const idTransaccion = await generarIdTransaccionUnico();
  const fecha = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const movimiento: MovimientoFinanciero = {
    id_transaccion: idTransaccion,
    id_paciente: input.idPaciente,
    id_medico: idMedico,
    fecha,
    concepto: input.concepto,
    tipo: input.tipo,
    monto: input.monto,
    notas: input.notas,
  };

  await agregarFila(RANGO_SALDOS, [
    movimiento.id_transaccion,
    movimiento.id_paciente,
    movimiento.id_medico,
    movimiento.fecha,
    movimiento.concepto,
    movimiento.tipo,
    movimiento.monto,
    movimiento.notas,
  ]);

  console.log(
    `[saldosRepository] Movimiento creado id_transaccion="${idTransaccion}" (id_paciente="${input.idPaciente}", ` +
      `tipo="${input.tipo}", monto=${input.monto}).`,
  );

  return movimiento;
}

/**
 * Lista todos los movimientos financieros de un paciente, en el mismo orden
 * (append-only) en el que se guardaron en la hoja — `TablaMovimientos.tsx`
 * y `calcularResumenFinanciero` no dependen de que vengan ordenados por
 * fecha, pero en la práctica sí lo estarán porque siempre se insertan al
 * final.
 */
export async function listarMovimientosPorPaciente(idPaciente: string): Promise<MovimientoFinanciero[]> {
  const filas = await leerRango(RANGO_SALDOS);
  return filas
    .filter((fila) => (fila[INDICE_ID_PACIENTE] ?? '').trim() === idPaciente)
    .map(filaAMovimiento);
}
