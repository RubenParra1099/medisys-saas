import { actualizarCelda, leerRango, leerRangoConNumeroFila } from '@/utils/googleSheets';
import type { ConfiguracionRecordatorios, Medico, HorarioConfig } from '@/types';

/**
 * Acceso a datos de la pestaña "Medicos".
 * Columnas: A=id_medico, B=nombre, C=especialidad, D=ciudad, E=precio_consulta,
 *           F=foto_url, G=plan_suscripcion, H=estatus_pago, I=horario_config (JSON),
 *           J=correo_contacto, K=cedula_profesional, L=direccion, M=calificacion,
 *           N=usuario_login, O=password_hash, P=configuracion_recordatorios (JSON).
 * J-P son columnas opcionales recomendadas (ver types/index.ts).
 *
 * ⚠️ N y O están RESERVADAS para las credenciales de login (ver
 * `authRepository.ts` — `usuario_login`/`password_hash`, el "diseño actual,
 * seguro" documentado ahí). Este archivo NUNCA debe leer ni escribir esas
 * dos columnas — por eso `filaAMedico` las descarta explícitamente (ver
 * abajo) y `configuracion_recordatorios` se agregó en la columna **P**, no
 * en N, aunque N sea la "siguiente libre" después de M a simple vista.
 */
const NOMBRE_HOJA_MEDICOS = 'Medicos';
const RANGO_MEDICOS = 'Medicos!A2:P';
const PRIMERA_FILA_DE_DATOS = 2;
const COLUMNA_CONFIGURACION_RECORDATORIOS = 'P';

/** Usado cuando la columna P no existe todavía, o su JSON está corrupto — nunca se bloquea la UI por esto. */
export const CONFIGURACION_RECORDATORIOS_POR_DEFECTO: ConfiguracionRecordatorios = {
  recordatorio24hActivo: true,
  recordatorio2hActivo: true,
  alertasAutomaticasActivas: true,
};

function saneaConfiguracionRecordatorios(valor: string | undefined): ConfiguracionRecordatorios {
  if (!valor || !valor.trim()) return CONFIGURACION_RECORDATORIOS_POR_DEFECTO;

  try {
    const parsed = JSON.parse(valor);
    return {
      recordatorio24hActivo:
        typeof parsed?.recordatorio24hActivo === 'boolean'
          ? parsed.recordatorio24hActivo
          : CONFIGURACION_RECORDATORIOS_POR_DEFECTO.recordatorio24hActivo,
      recordatorio2hActivo:
        typeof parsed?.recordatorio2hActivo === 'boolean'
          ? parsed.recordatorio2hActivo
          : CONFIGURACION_RECORDATORIOS_POR_DEFECTO.recordatorio2hActivo,
      alertasAutomaticasActivas:
        typeof parsed?.alertasAutomaticasActivas === 'boolean'
          ? parsed.alertasAutomaticasActivas
          : CONFIGURACION_RECORDATORIOS_POR_DEFECTO.alertasAutomaticasActivas,
    };
  } catch (error) {
    console.error('[medicosRepository] configuracion_recordatorios inválida (JSON corrupto):', error);
    return CONFIGURACION_RECORDATORIOS_POR_DEFECTO;
  }
}

function filaAMedico(fila: string[]): Medico | null {
  // Nota de las dos posiciones vacías antes de `configuracion_recordatorios_raw`:
  // son las columnas N y O (usuario_login/password_hash — ver advertencia
  // arriba). Se saltan deliberadamente con "huecos" en la desestructuración
  // (sin nombre de variable) para que sea imposible leerlas por accidente
  // desde aquí.
  const [
    id_medico,
    nombre,
    especialidad,
    ciudad,
    precio_consulta,
    foto_url,
    plan_suscripcion,
    estatus_pago,
    horario_config_raw,
    correo_contacto,
    cedula_profesional,
    direccion,
    calificacion_raw,
    ,
    ,
    configuracion_recordatorios_raw,
  ] = fila;

  if (!id_medico) return null;

  let horario_config: HorarioConfig | undefined;
  try {
    horario_config = horario_config_raw ? JSON.parse(horario_config_raw) : undefined;
  } catch (error) {
    console.error(`[medicosRepository] horario_config inválido para el médico ${id_medico}:`, error);
    horario_config = undefined;
  }

  const calificacion = calificacion_raw ? Number(calificacion_raw) : undefined;

  return {
    id_medico,
    nombre: nombre ?? '',
    especialidad: especialidad ?? '',
    ciudad: ciudad ?? '',
    precio_consulta: Number(precio_consulta) || 0,
    foto_url: foto_url ?? '',
    plan_suscripcion: (plan_suscripcion as Medico['plan_suscripcion']) ?? 'basico',
    estatus_pago: (estatus_pago as Medico['estatus_pago']) ?? 'pendiente',
    horario_config: horario_config as HorarioConfig,
    correo_contacto: correo_contacto?.trim() || undefined,
    cedula_profesional: cedula_profesional?.trim() || undefined,
    direccion: direccion?.trim() || undefined,
    calificacion: Number.isFinite(calificacion) ? calificacion : undefined,
    configuracion_recordatorios: saneaConfiguracionRecordatorios(configuracion_recordatorios_raw),
  };
}

/** Obtiene un médico por id, o `null` si no existe. Lanza si falla la lectura de la hoja. */
export async function obtenerMedicoPorId(idMedico: string): Promise<Medico | null> {
  const filas = await leerRango(RANGO_MEDICOS);
  for (const fila of filas) {
    if (fila[0] === idMedico) {
      return filaAMedico(fila);
    }
  }
  return null;
}

/** Lista todos los médicos (útil para el directorio/búsqueda). */
export async function listarMedicos(): Promise<Medico[]> {
  const filas = await leerRango(RANGO_MEDICOS);
  return filas.map(filaAMedico).filter((m): m is Medico => m !== null);
}

async function buscarNumeroFilaPorIdMedico(idMedico: string): Promise<number | null> {
  const filas = await leerRangoConNumeroFila(RANGO_MEDICOS, PRIMERA_FILA_DE_DATOS);
  for (const { numeroFila, valores } of filas) {
    if (valores[0] === idMedico) return numeroFila;
  }
  return null;
}

/**
 * Sobrescribe la columna P (`configuracion_recordatorios`, JSON) de la fila
 * del médico en "Medicos" — usado por la Mesa de Control de Recordatorios
 * (`/dashboard/recordatorios`). Devuelve `null` si el `id_medico` de la
 * sesión no tiene fila en "Medicos" (cuenta recién creada sin perfil
 * completo todavía), en vez de lanzar.
 *
 * Escribe EXCLUSIVAMENTE la columna P — nunca N/O (credenciales de login,
 * ver advertencia arriba).
 */
export async function actualizarConfiguracionRecordatorios(
  idMedico: string,
  configuracion: ConfiguracionRecordatorios,
): Promise<Medico | null> {
  const numeroFila = await buscarNumeroFilaPorIdMedico(idMedico);
  if (!numeroFila) return null;

  await actualizarCelda(
    `${NOMBRE_HOJA_MEDICOS}!${COLUMNA_CONFIGURACION_RECORDATORIOS}${numeroFila}`,
    JSON.stringify(configuracion),
  );

  return obtenerMedicoPorId(idMedico);
}
