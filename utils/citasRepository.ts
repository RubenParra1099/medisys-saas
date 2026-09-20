import { cache } from 'react';
import { actualizarCelda, leerRango, leerRangoConNumeroFila } from '@/utils/googleSheets';
import type { Cita, EstatusCita } from '@/types';

/**
 * Acceso a datos de la pestaña "Citas".
 * Columnas: A=id_cita, B=id_medico, C=nombre_paciente, D=telefono_paciente,
 *           E=correo_paciente, F=fecha, G=hora, H=estatus.
 */
const NOMBRE_HOJA_CITAS = 'Citas';
const RANGO_CITAS_SIN_ENCABEZADO = `${NOMBRE_HOJA_CITAS}!A2:H`;
const PRIMERA_FILA_DE_DATOS = 2;

function filaACita(fila: string[]): Cita | null {
  const [id_cita, id_medico, nombre_paciente, telefono_paciente, correo_paciente, fecha, hora, estatus] = fila;
  if (!id_cita) return null;

  return {
    id_cita,
    id_medico: id_medico ?? '',
    nombre_paciente: nombre_paciente ?? '',
    telefono_paciente: telefono_paciente ?? '',
    correo_paciente: correo_paciente ?? '',
    fecha: fecha ?? '',
    hora: hora ?? '',
    estatus: (estatus as EstatusCita) || 'Pendiente',
  };
}

/**
 * Lista las citas de un médico, ordenadas por fecha y hora ascendente.
 *
 * Envuelta en `cache()` de React: dentro de una misma petición (p. ej. el
 * layout del panel calculando el contador de pendientes y la página de
 * Agenda pidiendo el listado completo) las llamadas con el mismo
 * `idMedico` se resuelven una sola vez contra Google Sheets.
 */
export const listarCitasPorMedico = cache(async (idMedico: string): Promise<Cita[]> => {
  const filas = await leerRango(RANGO_CITAS_SIN_ENCABEZADO);
  const citas = filas.map(filaACita).filter((c): c is Cita => c !== null && c.id_medico === idMedico);

  return citas.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
});

interface FilaCita {
  numeroFila: number;
  cita: Cita;
}

async function buscarFilaPorIdCita(idCita: string): Promise<FilaCita | null> {
  const filas = await leerRangoConNumeroFila(RANGO_CITAS_SIN_ENCABEZADO, PRIMERA_FILA_DE_DATOS);

  for (const { numeroFila, valores } of filas) {
    const cita = filaACita(valores);
    if (cita && cita.id_cita === idCita) {
      return { numeroFila, cita };
    }
  }

  return null;
}

/**
 * Actualiza el estatus de una cita localizándola por `id_cita` y escribiendo
 * la columna H (estatus) con el helper `actualizarCelda` del cliente JWT.
 * Devuelve la cita ya actualizada, o `null` si no existe ese id_cita.
 */
export async function actualizarEstatusCita(idCita: string, nuevoEstatus: EstatusCita): Promise<Cita | null> {
  const encontrada = await buscarFilaPorIdCita(idCita);
  if (!encontrada) return null;

  await actualizarCelda(`${NOMBRE_HOJA_CITAS}!H${encontrada.numeroFila}`, nuevoEstatus);

  return { ...encontrada.cita, estatus: nuevoEstatus };
}
