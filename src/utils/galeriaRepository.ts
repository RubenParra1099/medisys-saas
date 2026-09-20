import { agregarFila, leerRango } from '@/utils/googleSheets';
import type { FotoGaleria, SubirFotoGaleriaInput, TipoArchivoGaleria } from '@/types';

/**
 * Acceso de dominio a la pestaña "Galeria_Clinica" — vista "Galería
 * Clínica".
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Galeria_Clinica" con estos encabezados en la
 * Fila 1, en este orden exacto:
 *
 *   id_foto | id_paciente | fecha | descripcion | imagen_url | tipo_archivo
 *
 * A propósito no tiene columna `id_medico` (así se especificó) — ver la nota
 * en `FotoGaleria` (`src/types/index.ts`) sobre cómo queda acotado el acceso.
 */

const RANGO_GALERIA = 'Galeria_Clinica!A2:F';
const INDICE_ID_FOTO = 0;
const INDICE_ID_PACIENTE = 1;
const INDICE_FECHA = 2;
const INDICE_DESCRIPCION = 3;
const INDICE_IMAGEN_URL = 4;
const INDICE_TIPO_ARCHIVO = 5;

const PREFIJO_ID_FOTO = 'IMG-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

function saneaTipoArchivo(valor: string): TipoArchivoGaleria {
  return valor.trim() === 'Radiografia' ? 'Radiografia' : 'Fotografia';
}

function filaAFoto(fila: string[]): FotoGaleria {
  return {
    id_foto: (fila[INDICE_ID_FOTO] ?? '').trim(),
    id_paciente: (fila[INDICE_ID_PACIENTE] ?? '').trim(),
    fecha: (fila[INDICE_FECHA] ?? '').trim(),
    descripcion: (fila[INDICE_DESCRIPCION] ?? '').trim(),
    imagen_url: (fila[INDICE_IMAGEN_URL] ?? '').trim(),
    tipo_archivo: saneaTipoArchivo(fila[INDICE_TIPO_ARCHIVO] ?? ''),
  };
}

/**
 * Genera un `id_foto` con formato "IMG-12345" (5 dígitos) que no colisione
 * con ninguno ya existente — mismo esquema colisión-verificada que el resto
 * de los repositorios de este proyecto. También se usa como semilla
 * determinística de la URL de placeholder (ver `agregarFoto`).
 */
async function generarIdFotoUnico(): Promise<string> {
  const filas = await leerRango(RANGO_GALERIA);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_FOTO] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_FOTO}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(`[galeriaRepository] No fue posible generar un id_foto único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`);
}

/**
 * Inserta una nueva foto/radiografía al final de la pestaña
 * "Galeria_Clinica". No existe todavía infraestructura real de carga de
 * archivos, así que — tal como se pidió — se simula la carga generando una
 * URL de placeholder determinística a partir del `id_foto` recién generado
 * (misma imagen cada vez que se recargue esa fila, en vez de una imagen
 * aleatoria distinta en cada visita).
 */
export async function agregarFoto(input: SubirFotoGaleriaInput): Promise<FotoGaleria> {
  const idFoto = await generarIdFotoUnico();
  const fecha = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const imagenUrl = `https://picsum.photos/seed/${idFoto}/480/360`;

  const foto: FotoGaleria = {
    id_foto: idFoto,
    id_paciente: input.idPaciente,
    fecha,
    descripcion: input.descripcion,
    imagen_url: imagenUrl,
    tipo_archivo: input.tipoArchivo,
  };

  await agregarFila(RANGO_GALERIA, [
    foto.id_foto,
    foto.id_paciente,
    foto.fecha,
    foto.descripcion,
    foto.imagen_url,
    foto.tipo_archivo,
  ]);

  console.log(`[galeriaRepository] Foto agregada id_foto="${idFoto}" (id_paciente="${input.idPaciente}").`);

  return foto;
}

/** Lista las fotos de un paciente, más reciente primero (mismo criterio que `listarHistorialPorPaciente`). */
export async function listarFotosPorPaciente(idPaciente: string): Promise<FotoGaleria[]> {
  const filas = await leerRango(RANGO_GALERIA);
  return filas
    .filter((fila) => (fila[INDICE_ID_PACIENTE] ?? '').trim() === idPaciente)
    .map(filaAFoto)
    .reverse();
}
