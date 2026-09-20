import { agregarFila, leerRango } from '@/utils/googleSheets';
import { sanearEstadoOdontograma } from '@/components/odontograma/tipos';
import type { EstadoOdontograma } from '@/components/odontograma/tipos';

/**
 * Acceso de dominio a la pestaña "Odontogramas" — persistencia real del
 * Módulo de Odontograma IA (antes de este paso, el estado solo vivía en
 * `useState` del cliente y se perdía al recargar la página).
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Odontogramas" con estos encabezados en la
 * Fila 1, en este orden exacto:
 *
 *   id_odontograma | id_paciente | id_medico | fecha | datos_dentales | notas_evolucion
 *
 * `datos_dentales` guarda el `EstadoOdontograma` completo (número de pieza →
 * estado de sus 5 superficies) serializado con `JSON.stringify` — es la
 * ÚNICA columna que no es texto plano legible a simple vista en la hoja.
 *
 * MODELO DE "ÚLTIMO REGISTRO": cada clic en "Guardar Evolución" hace un
 * INSERT (fila nueva al final, vía `agregarFila` → `values.append`), nunca
 * un UPDATE — así queda un historial completo de snapshots por paciente en
 * la propia hoja. Por lo tanto, "el último registro guardado para un
 * paciente" es, por construcción de solo-anexar, la última fila que
 * coincide con ese `id_paciente` al recorrer la hoja de arriba hacia abajo.
 * Si algún día se reordenan filas manualmente en el Sheet, esta suposición
 * dejaría de sostenerse — no es un problema en el flujo normal de la app.
 */

const RANGO_ODONTOGRAMAS = 'Odontogramas!A2:F';
// Índices dentro de cada fila del rango anterior (A=0, B=1, ...).
const INDICE_ID_ODONTOGRAMA = 0;
const INDICE_ID_PACIENTE = 1;
const INDICE_ID_MEDICO = 2;
const INDICE_FECHA = 3;
const INDICE_DATOS_DENTALES = 4;
const INDICE_NOTAS_EVOLUCION = 5;

export interface OdontogramaGuardado {
  idOdontograma: string;
  idPaciente: string;
  idMedico: string;
  fecha: string;
  estado: EstadoOdontograma;
  notasEvolucion: string;
}

export interface GuardarOdontogramaInput {
  idPaciente: string;
  idMedico: string;
  estado: EstadoOdontograma;
  notasEvolucion: string;
}

/** Genera un id legible y suficientemente único para este alcance (sin dependencias externas de UUID). */
function generarIdOdontograma(): string {
  const marcaDeTiempo = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `odo_${marcaDeTiempo}_${aleatorio}`;
}

/**
 * Inserta un nuevo snapshot del odontograma del paciente al final de la
 * pestaña "Odontogramas". Devuelve el `id_odontograma` recién creado.
 */
export async function guardarOdontograma(input: GuardarOdontogramaInput): Promise<string> {
  const idOdontograma = generarIdOdontograma();
  const fecha = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const datosDentalesSerializados = JSON.stringify(input.estado);

  await agregarFila(RANGO_ODONTOGRAMAS, [
    idOdontograma,
    input.idPaciente,
    input.idMedico,
    fecha,
    datosDentalesSerializados,
    input.notasEvolucion,
  ]);

  console.log(
    `[odontogramaRepository] Guardado id_odontograma="${idOdontograma}" para id_paciente="${input.idPaciente}" ` +
      `(id_medico="${input.idMedico}", fecha="${fecha}").`,
  );

  return idOdontograma;
}

/**
 * Devuelve el último registro guardado para un paciente (ver "MODELO DE
 * ÚLTIMO REGISTRO" arriba), con `datos_dentales` ya decodificado y saneado
 * a un `EstadoOdontograma` seguro de usar directamente como estado inicial
 * del mapa dental interactivo. Devuelve `null` si el paciente nunca ha sido
 * guardado.
 */
export async function obtenerUltimoOdontogramaPorPaciente(
  idPaciente: string,
): Promise<OdontogramaGuardado | null> {
  const idPacienteNormalizado = idPaciente.trim();
  if (!idPacienteNormalizado) return null;

  const filas = await leerRango(RANGO_ODONTOGRAMAS);
  console.log(
    `[odontogramaRepository] Buscando el último odontograma de id_paciente="${idPacienteNormalizado}" ` +
      `entre ${filas.length} filas de "Odontogramas".`,
  );

  let ultimoEncontrado: OdontogramaGuardado | null = null;

  for (const fila of filas) {
    const idPacienteFila = (fila[INDICE_ID_PACIENTE] ?? '').trim();
    if (idPacienteFila !== idPacienteNormalizado) continue;

    const datosDentalesCrudos = fila[INDICE_DATOS_DENTALES] ?? '';
    let estadoParseado: unknown = null;
    try {
      estadoParseado = datosDentalesCrudos ? JSON.parse(datosDentalesCrudos) : {};
    } catch (error) {
      console.warn(
        `[odontogramaRepository] datos_dentales corrupto (no es JSON válido) en una fila de ` +
          `id_paciente="${idPacienteNormalizado}" — se ignora esa fila. Detalle: ${
            error instanceof Error ? error.message : String(error)
          }`,
      );
      continue; // No sobrescribe `ultimoEncontrado`: se conserva la última fila válida vista hasta ahora.
    }

    ultimoEncontrado = {
      idOdontograma: (fila[INDICE_ID_ODONTOGRAMA] ?? '').trim(),
      idPaciente: idPacienteFila,
      idMedico: (fila[INDICE_ID_MEDICO] ?? '').trim(),
      fecha: (fila[INDICE_FECHA] ?? '').trim(),
      estado: sanearEstadoOdontograma(estadoParseado),
      notasEvolucion: (fila[INDICE_NOTAS_EVOLUCION] ?? '').trim(),
    };
  }

  console.log(
    ultimoEncontrado
      ? `[odontogramaRepository] Último odontograma encontrado: id_odontograma="${ultimoEncontrado.idOdontograma}" (fecha="${ultimoEncontrado.fecha}").`
      : `[odontogramaRepository] id_paciente="${idPacienteNormalizado}" no tiene ningún odontograma guardado todavía.`,
  );

  return ultimoEncontrado;
}
