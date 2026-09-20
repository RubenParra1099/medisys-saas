import { actualizarFila, agregarFila, leerRango, leerRangoConNumeroFila } from '@/utils/googleSheets';
import type { ConfiguracionConsultorio, DiaSemana, GuardarConsultorioInput, HorasAtencion } from '@/types';

/**
 * Acceso de dominio a la pestaña "Consultorios" — vista "Mi Consultorio".
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Consultorios" con estos encabezados en la
 * Fila 1, en este orden exacto:
 *
 *   id_medico | nombre_clinica | telefono_comercial | direccion_fisica | dias_atencion | horas_atencion_json
 *
 * A diferencia de "Pacientes"/"Saldos" (append-only), esta pestaña es una
 * relación 1 a 1 con "Medicos": cada médico tiene como máximo UNA fila, que
 * se sobrescribe (upsert) cada vez que guarda el formulario — nunca se
 * acumulan filas duplicadas para el mismo `id_medico`.
 */

const NOMBRE_HOJA_CONSULTORIOS = 'Consultorios';
const RANGO_CONSULTORIOS = 'Consultorios!A2:F';
const PRIMERA_FILA_DE_DATOS = 2;

const INDICE_ID_MEDICO = 0;
const INDICE_NOMBRE_CLINICA = 1;
const INDICE_TELEFONO_COMERCIAL = 2;
const INDICE_DIRECCION_FISICA = 3;
const INDICE_DIAS_ATENCION = 4;
const INDICE_HORAS_ATENCION_JSON = 5;

const DIAS_VALIDOS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const HORAS_ATENCION_POR_DEFECTO: HorasAtencion = { horaApertura: '09:00', horaCierre: '18:00' };

/** Descarta cualquier fragmento que no sea un día de la semana válido — nunca lanza por texto corrupto. */
function saneaDiasAtencion(valor: string): DiaSemana[] {
  if (!valor.trim()) return [];
  return valor
    .split(',')
    .map((dia) => dia.trim().toLowerCase())
    .filter((dia): dia is DiaSemana => DIAS_VALIDOS.includes(dia as DiaSemana));
}

/** Igual que `sanearEstadoOdontograma`/`configuracion_recordatorios`: JSON corrupto o ausente cae a un default seguro. */
function saneaHorasAtencion(valor: string): HorasAtencion {
  if (!valor.trim()) return HORAS_ATENCION_POR_DEFECTO;

  try {
    const parsed = JSON.parse(valor);
    if (typeof parsed?.horaApertura === 'string' && typeof parsed?.horaCierre === 'string') {
      return { horaApertura: parsed.horaApertura, horaCierre: parsed.horaCierre };
    }
    return HORAS_ATENCION_POR_DEFECTO;
  } catch (error) {
    console.error('[consultorioRepository] horas_atencion_json inválido (JSON corrupto):', error);
    return HORAS_ATENCION_POR_DEFECTO;
  }
}

function filaAConsultorio(fila: string[]): ConfiguracionConsultorio {
  return {
    id_medico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
    nombre_clinica: (fila[INDICE_NOMBRE_CLINICA] ?? '').trim(),
    telefono_comercial: (fila[INDICE_TELEFONO_COMERCIAL] ?? '').trim(),
    direccion_fisica: (fila[INDICE_DIRECCION_FISICA] ?? '').trim(),
    dias_atencion: saneaDiasAtencion(fila[INDICE_DIAS_ATENCION] ?? ''),
    horas_atencion: saneaHorasAtencion(fila[INDICE_HORAS_ATENCION_JSON] ?? ''),
  };
}

/** Busca la configuración de consultorio de un médico. Devuelve `null` si todavía no la ha guardado. */
export async function obtenerConsultorioPorIdMedico(idMedico: string): Promise<ConfiguracionConsultorio | null> {
  const idNormalizado = idMedico.trim();
  if (!idNormalizado) return null;

  const filas = await leerRango(RANGO_CONSULTORIOS);
  for (const fila of filas) {
    if ((fila[INDICE_ID_MEDICO] ?? '').trim() === idNormalizado) {
      return filaAConsultorio(fila);
    }
  }
  return null;
}

async function buscarNumeroFilaPorIdMedico(idMedico: string): Promise<number | null> {
  const filas = await leerRangoConNumeroFila(RANGO_CONSULTORIOS, PRIMERA_FILA_DE_DATOS);
  for (const { numeroFila, valores } of filas) {
    if ((valores[INDICE_ID_MEDICO] ?? '').trim() === idMedico) return numeroFila;
  }
  return null;
}

/**
 * Guarda (crea o actualiza) la configuración de consultorio de un médico.
 * Si ya existe una fila para ese `id_medico`, se sobrescribe completa con
 * `actualizarFila`; si no existe, se agrega una nueva con `agregarFila`.
 */
export async function guardarConsultorio(
  idMedico: string,
  input: GuardarConsultorioInput,
): Promise<ConfiguracionConsultorio> {
  const consultorio: ConfiguracionConsultorio = {
    id_medico: idMedico,
    nombre_clinica: input.nombreClinica,
    telefono_comercial: input.telefonoComercial,
    direccion_fisica: input.direccionFisica,
    dias_atencion: input.diasAtencion,
    horas_atencion: { horaApertura: input.horaApertura, horaCierre: input.horaCierre },
  };

  const valores = [
    consultorio.id_medico,
    consultorio.nombre_clinica,
    consultorio.telefono_comercial,
    consultorio.direccion_fisica,
    consultorio.dias_atencion.join(','),
    JSON.stringify(consultorio.horas_atencion),
  ];

  const numeroFilaExistente = await buscarNumeroFilaPorIdMedico(idMedico);

  if (numeroFilaExistente) {
    await actualizarFila(`${NOMBRE_HOJA_CONSULTORIOS}!A${numeroFilaExistente}:F${numeroFilaExistente}`, valores);
  } else {
    await agregarFila(RANGO_CONSULTORIOS, valores);
  }

  console.log(
    `[consultorioRepository] Consultorio ${numeroFilaExistente ? 'actualizado' : 'creado'} para id_medico="${idMedico}".`,
  );

  return consultorio;
}
