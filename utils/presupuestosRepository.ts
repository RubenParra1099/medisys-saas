import { actualizarCelda, agregarFila, leerRango, leerRangoConNumeroFila } from '@/utils/googleSheets';
import type { CrearPresupuestoInput, EstatusPresupuesto, ItemPresupuesto, PresupuestoDetallado } from '@/types';

/**
 * Acceso de dominio a la pestaña "Presupuestos_Detallados" — vista
 * "Cotizador de Presupuestos".
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Presupuestos_Detallados" con estos
 * encabezados en la Fila 1, en este orden exacto:
 *
 *   id_presupuesto | id_paciente | id_medico | fecha | items_json | descuento | total_mxn | estatus
 */

const NOMBRE_HOJA_PRESUPUESTOS = 'Presupuestos_Detallados';
const RANGO_PRESUPUESTOS = 'Presupuestos_Detallados!A2:H';
const PRIMERA_FILA_DE_DATOS = 2;

const INDICE_ID_PRESUPUESTO = 0;
const INDICE_ID_PACIENTE = 1;
const INDICE_ID_MEDICO = 2;
const INDICE_FECHA = 3;
const INDICE_ITEMS_JSON = 4;
const INDICE_DESCUENTO = 5;
const INDICE_TOTAL_MXN = 6;
const INDICE_ESTATUS = 7;

const PREFIJO_ID_PRESUPUESTO = 'PRE-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

/**
 * Calcula el total de un presupuesto: `suma(costoUnitario * cantidad de cada item) - descuento`,
 * nunca negativo. Es una función pura (sin dependencias de Google Sheets) a
 * propósito, para poder verificarla de forma aislada con un script de Node
 * — igual que `calcularResumenFinanciero` en el Cotizador de Saldos. Se usa
 * como la fuente de verdad del lado del SERVIDOR; existe una copia idéntica
 * en `components/cotizador/tipos.ts` para la vista previa en vivo del
 * cliente mientras arma el presupuesto (mismo patrón ya usado con
 * `formatearMoneda`, duplicada entre capas para no importar `googleapis`
 * hacia un componente `'use client'`).
 */
export function calcularTotalPresupuesto(items: ItemPresupuesto[], descuento: number): number {
  const subtotal = items.reduce((acumulado, item) => acumulado + item.costoUnitario * item.cantidad, 0);
  return Math.max(0, subtotal - descuento);
}

/** Descarta cualquier item malformado (tipos incorrectos) en vez de tronar por una fila corrupta. */
function saneaItems(valor: string): ItemPresupuesto[] {
  if (!valor.trim()) return [];

  try {
    const parsed = JSON.parse(valor);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is ItemPresupuesto => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.tratamiento === 'string' &&
        typeof item.diente === 'string' &&
        typeof item.costoUnitario === 'number' &&
        Number.isFinite(item.costoUnitario) &&
        typeof item.cantidad === 'number' &&
        Number.isFinite(item.cantidad)
      );
    });
  } catch (error) {
    console.error('[presupuestosRepository] items_json inválido (JSON corrupto):', error);
    return [];
  }
}

function saneaEstatus(valor: string): EstatusPresupuesto {
  return valor.trim() === 'Aceptado' ? 'Aceptado' : 'Borrador';
}

function saneaMonto(valor: string): number {
  const numero = Number.parseFloat(valor.trim());
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function filaAPresupuesto(fila: string[]): PresupuestoDetallado {
  return {
    id_presupuesto: (fila[INDICE_ID_PRESUPUESTO] ?? '').trim(),
    id_paciente: (fila[INDICE_ID_PACIENTE] ?? '').trim(),
    id_medico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
    fecha: (fila[INDICE_FECHA] ?? '').trim(),
    items: saneaItems(fila[INDICE_ITEMS_JSON] ?? ''),
    descuento: saneaMonto(fila[INDICE_DESCUENTO] ?? ''),
    total_mxn: saneaMonto(fila[INDICE_TOTAL_MXN] ?? ''),
    estatus: saneaEstatus(fila[INDICE_ESTATUS] ?? ''),
  };
}

/**
 * Genera un `id_presupuesto` con formato "PRE-12345" (5 dígitos) que no
 * colisione con ninguno ya existente — mismo esquema colisión-verificada que
 * el resto de los repositorios de este proyecto.
 */
async function generarIdPresupuestoUnico(): Promise<string> {
  const filas = await leerRango(RANGO_PRESUPUESTOS);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_PRESUPUESTO] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_PRESUPUESTO}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(
    `[presupuestosRepository] No fue posible generar un id_presupuesto único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`,
  );
}

/**
 * Inserta un nuevo presupuesto (siempre como `'Borrador'`) al final de la
 * pestaña "Presupuestos_Detallados". `total_mxn` se calcula aquí mismo, del
 * lado del servidor — nunca se recibe ni se confía en un total mandado por
 * el cliente.
 */
export async function crearPresupuesto(
  input: CrearPresupuestoInput,
  idMedico: string,
): Promise<PresupuestoDetallado> {
  const idPresupuesto = await generarIdPresupuestoUnico();
  const fecha = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const totalMxn = calcularTotalPresupuesto(input.items, input.descuento);

  const presupuesto: PresupuestoDetallado = {
    id_presupuesto: idPresupuesto,
    id_paciente: input.idPaciente,
    id_medico: idMedico,
    fecha,
    items: input.items,
    descuento: input.descuento,
    total_mxn: totalMxn,
    estatus: 'Borrador',
  };

  await agregarFila(RANGO_PRESUPUESTOS, [
    presupuesto.id_presupuesto,
    presupuesto.id_paciente,
    presupuesto.id_medico,
    presupuesto.fecha,
    JSON.stringify(presupuesto.items),
    presupuesto.descuento,
    presupuesto.total_mxn,
    presupuesto.estatus,
  ]);

  console.log(
    `[presupuestosRepository] Presupuesto creado id_presupuesto="${idPresupuesto}" ` +
      `(id_paciente="${input.idPaciente}", total_mxn=${totalMxn}).`,
  );

  return presupuesto;
}

/**
 * Lista los presupuestos de un paciente, más reciente primero (mismo
 * criterio que `listarHistorialPorPaciente`: se invierte el orden de
 * inserción en vez de ordenar por `fecha`).
 */
export async function listarPresupuestosPorPaciente(idPaciente: string): Promise<PresupuestoDetallado[]> {
  const filas = await leerRango(RANGO_PRESUPUESTOS);
  return filas
    .filter((fila) => (fila[INDICE_ID_PACIENTE] ?? '').trim() === idPaciente)
    .map(filaAPresupuesto)
    .reverse();
}

interface FilaPresupuesto {
  numeroFila: number;
  presupuesto: PresupuestoDetallado;
}

async function buscarFilaPorIdPresupuesto(idPresupuesto: string): Promise<FilaPresupuesto | null> {
  const filas = await leerRangoConNumeroFila(RANGO_PRESUPUESTOS, PRIMERA_FILA_DE_DATOS);

  for (const { numeroFila, valores } of filas) {
    const presupuesto = filaAPresupuesto(valores);
    if (presupuesto.id_presupuesto === idPresupuesto) {
      return { numeroFila, presupuesto };
    }
  }

  return null;
}

/**
 * Busca un presupuesto por `id_presupuesto`. Devuelve `null` si no existe —
 * usado por `POST /api/presupuestos/pasar-a-cuenta` para validar antes de
 * tocar "Saldos".
 */
export async function obtenerPresupuestoPorId(idPresupuesto: string): Promise<PresupuestoDetallado | null> {
  const encontrado = await buscarFilaPorIdPresupuesto(idPresupuesto);
  return encontrado?.presupuesto ?? null;
}

/**
 * Marca un presupuesto como `'Aceptado'` localizándolo por `id_presupuesto`
 * y escribiendo la columna H (estatus) con `actualizarCelda`. Devuelve el
 * presupuesto ya actualizado, o `null` si no existe.
 */
export async function actualizarEstatusPresupuesto(
  idPresupuesto: string,
  nuevoEstatus: EstatusPresupuesto,
): Promise<PresupuestoDetallado | null> {
  const encontrado = await buscarFilaPorIdPresupuesto(idPresupuesto);
  if (!encontrado) return null;

  await actualizarCelda(`${NOMBRE_HOJA_PRESUPUESTOS}!H${encontrado.numeroFila}`, nuevoEstatus);

  return { ...encontrado.presupuesto, estatus: nuevoEstatus };
}
