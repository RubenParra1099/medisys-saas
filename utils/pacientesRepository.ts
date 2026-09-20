import { agregarFila, leerRango } from '@/utils/googleSheets';
import type { CrearPacienteInput, Paciente } from '@/types';

/**
 * Acceso de dominio a la pestaña "Pacientes" — Captura de Pacientes Nuevos.
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Pacientes" con estos encabezados en la
 * Fila 1, en este orden exacto:
 *
 *   id_paciente | id_medico | nombre_completo | telefono | correo | fecha_nacimiento | antecedentes_medicos | fecha_registro
 */

const RANGO_PACIENTES = 'Pacientes!A2:H';
// Índices dentro de cada fila del rango anterior (A=0, B=1, ...).
const INDICE_ID_PACIENTE = 0;
const INDICE_ID_MEDICO = 1;
const INDICE_NOMBRE_COMPLETO = 2;
const INDICE_TELEFONO = 3;
const INDICE_CORREO = 4;
const INDICE_FECHA_NACIMIENTO = 5;
const INDICE_ANTECEDENTES_MEDICOS = 6;
const INDICE_FECHA_REGISTRO = 7;

const PREFIJO_ID_PACIENTE = 'PAC-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

function filaAPaciente(fila: string[]): Paciente {
  return {
    id_paciente: (fila[INDICE_ID_PACIENTE] ?? '').trim(),
    id_medico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
    nombre_completo: (fila[INDICE_NOMBRE_COMPLETO] ?? '').trim(),
    telefono: (fila[INDICE_TELEFONO] ?? '').trim(),
    correo: (fila[INDICE_CORREO] ?? '').trim(),
    fecha_nacimiento: (fila[INDICE_FECHA_NACIMIENTO] ?? '').trim(),
    antecedentes_medicos: (fila[INDICE_ANTECEDENTES_MEDICOS] ?? '').trim(),
    fecha_registro: (fila[INDICE_FECHA_REGISTRO] ?? '').trim(),
  };
}

/**
 * Genera un `id_paciente` con formato "PAC-12345" (5 dígitos) que no
 * colisione con ninguno ya existente en la hoja. Lee la hoja una sola vez
 * y prueba sufijos aleatorios en memoria — a la escala de un consultorio
 * (decenas/cientos de pacientes, contra 90,000 combinaciones posibles de 5
 * dígitos) la probabilidad de colisión es mínima, pero se verifica de
 * todos modos en vez de asumirlo.
 */
async function generarIdPacienteUnico(): Promise<string> {
  const filas = await leerRango(RANGO_PACIENTES);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_PACIENTE] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_PACIENTE}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(
    `[pacientesRepository] No fue posible generar un id_paciente único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`,
  );
}

/**
 * Inserta un nuevo paciente al final de la pestaña "Pacientes" y devuelve
 * el registro completo ya creado (con su `id_paciente` e `id_medico`
 * resueltos).
 */
export async function crearPaciente(input: CrearPacienteInput, idMedico: string): Promise<Paciente> {
  const idPaciente = await generarIdPacienteUnico();
  const fechaRegistro = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const paciente: Paciente = {
    id_paciente: idPaciente,
    id_medico: idMedico,
    nombre_completo: input.nombreCompleto,
    telefono: input.telefono,
    correo: input.correo,
    fecha_nacimiento: input.fechaNacimiento,
    antecedentes_medicos: input.antecedentesMedicos,
    fecha_registro: fechaRegistro,
  };

  await agregarFila(RANGO_PACIENTES, [
    paciente.id_paciente,
    paciente.id_medico,
    paciente.nombre_completo,
    paciente.telefono,
    paciente.correo,
    paciente.fecha_nacimiento,
    paciente.antecedentes_medicos,
    paciente.fecha_registro,
  ]);

  console.log(
    `[pacientesRepository] Paciente creado id_paciente="${idPaciente}" (id_medico="${idMedico}", ` +
      `fecha_registro="${fechaRegistro}").`,
  );

  return paciente;
}

/** Busca un paciente por su `id_paciente`. Devuelve `null` si no existe. */
export async function obtenerPacientePorId(idPaciente: string): Promise<Paciente | null> {
  const idNormalizado = idPaciente.trim();
  if (!idNormalizado) return null;

  const filas = await leerRango(RANGO_PACIENTES);

  for (const fila of filas) {
    if ((fila[INDICE_ID_PACIENTE] ?? '').trim() === idNormalizado) {
      return filaAPaciente(fila);
    }
  }

  return null;
}

/**
 * Lista todos los pacientes registrados por un médico — no se usa todavía
 * en ninguna pantalla (el buscador del odontograma sigue mostrando solo
 * `PACIENTES_DEMO`), pero se deja lista aquí siguiendo el mismo patrón que
 * `citasRepository.ts`/`medicosRepository.ts`, para cuando se construya el
 * listado real en `/dashboard/pacientes`.
 */
export async function listarPacientesPorMedico(idMedico: string): Promise<Paciente[]> {
  const filas = await leerRango(RANGO_PACIENTES);
  return filas
    .filter((fila) => (fila[INDICE_ID_MEDICO] ?? '').trim() === idMedico)
    .map(filaAPaciente);
}
