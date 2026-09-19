import { leerRango } from '@/utils/googleSheets';
import type { Medico, HorarioConfig } from '@/types';

/**
 * Acceso a datos de la pestaña "Medicos".
 * Columnas: A=id_medico, B=nombre, C=especialidad, D=ciudad, E=precio_consulta,
 *           F=foto_url, G=plan_suscripcion, H=estatus_pago, I=horario_config (JSON),
 *           J=correo_contacto, K=cedula_profesional, L=direccion, M=calificacion.
 * J-M son columnas opcionales recomendadas (ver types/index.ts).
 */
const RANGO_MEDICOS = 'Medicos!A2:M';

function filaAMedico(fila: string[]): Medico | null {
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
