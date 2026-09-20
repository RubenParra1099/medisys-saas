import { agregarFila, leerRango } from '@/utils/googleSheets';
import type { CrearRegistroHistorialInput, RegistroHistorialClinico } from '@/types';

/**
 * Acceso de dominio a la pestaña "Historiales_Clinicos" — vista "Historial
 * Clínico".
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Historiales_Clinicos" con estos encabezados
 * en la Fila 1, en este orden exacto:
 *
 *   id_historial | id_paciente | id_medico | fecha | motivo_consulta | diagnostico | tratamiento_sugerido | notas_privadas
 */

const RANGO_HISTORIALES_CLINICOS = 'Historiales_Clinicos!A2:H';
const INDICE_ID_HISTORIAL = 0;
const INDICE_ID_PACIENTE = 1;
const INDICE_ID_MEDICO = 2;
const INDICE_FECHA = 3;
const INDICE_MOTIVO_CONSULTA = 4;
const INDICE_DIAGNOSTICO = 5;
const INDICE_TRATAMIENTO_SUGERIDO = 6;
const INDICE_NOTAS_PRIVADAS = 7;

const PREFIJO_ID_HISTORIAL = 'HIST-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

function filaARegistroHistorial(fila: string[]): RegistroHistorialClinico {
  return {
    id_historial: (fila[INDICE_ID_HISTORIAL] ?? '').trim(),
    id_paciente: (fila[INDICE_ID_PACIENTE] ?? '').trim(),
    id_medico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
    fecha: (fila[INDICE_FECHA] ?? '').trim(),
    motivo_consulta: (fila[INDICE_MOTIVO_CONSULTA] ?? '').trim(),
    diagnostico: (fila[INDICE_DIAGNOSTICO] ?? '').trim(),
    tratamiento_sugerido: (fila[INDICE_TRATAMIENTO_SUGERIDO] ?? '').trim(),
    notas_privadas: (fila[INDICE_NOTAS_PRIVADAS] ?? '').trim(),
  };
}

/**
 * Genera un `id_historial` con formato "HIST-12345" (5 dígitos) que no
 * colisione con ninguno ya existente — mismo esquema colisión-verificada que
 * `generarIdPacienteUnico`/`generarIdTransaccionUnico`.
 */
async function generarIdHistorialUnico(): Promise<string> {
  const filas = await leerRango(RANGO_HISTORIALES_CLINICOS);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_HISTORIAL] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_HISTORIAL}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(
    `[historialClinicoRepository] No fue posible generar un id_historial único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`,
  );
}

/**
 * Inserta una nueva nota de evolución al final de la pestaña
 * "Historiales_Clinicos" y devuelve el registro completo ya creado.
 */
export async function crearRegistroHistorial(
  input: CrearRegistroHistorialInput,
  idMedico: string,
): Promise<RegistroHistorialClinico> {
  const idHistorial = await generarIdHistorialUnico();
  const fecha = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const registro: RegistroHistorialClinico = {
    id_historial: idHistorial,
    id_paciente: input.idPaciente,
    id_medico: idMedico,
    fecha,
    motivo_consulta: input.motivoConsulta,
    diagnostico: input.diagnostico,
    tratamiento_sugerido: input.tratamientoSugerido,
    notas_privadas: input.notasPrivadas,
  };

  await agregarFila(RANGO_HISTORIALES_CLINICOS, [
    registro.id_historial,
    registro.id_paciente,
    registro.id_medico,
    registro.fecha,
    registro.motivo_consulta,
    registro.diagnostico,
    registro.tratamiento_sugerido,
    registro.notas_privadas,
  ]);

  console.log(
    `[historialClinicoRepository] Nota de evolución creada id_historial="${idHistorial}" (id_paciente="${input.idPaciente}").`,
  );

  return registro;
}

/**
 * Lista el historial clínico de un paciente, más reciente primero — se
 * invierte el orden de inserción (append-only) en vez de ordenar por
 * `fecha`, porque varias notas del mismo día deben conservar su orden real
 * de captura en la Timeline.
 */
export async function listarHistorialPorPaciente(idPaciente: string): Promise<RegistroHistorialClinico[]> {
  const filas = await leerRango(RANGO_HISTORIALES_CLINICOS);
  return filas
    .filter((fila) => (fila[INDICE_ID_PACIENTE] ?? '').trim() === idPaciente)
    .map(filaARegistroHistorial)
    .reverse();
}
