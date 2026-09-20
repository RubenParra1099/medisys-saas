import { google, sheets_v4 } from 'googleapis';

/**
 * Cliente de acceso a Google Sheets usando autenticación por Service Account (JWT).
 *
 * Este archivo es la ÚNICA capa que debe conocer `googleapis`. El resto de la
 * aplicación (API routes, repositorios) consume las funciones exportadas aquí,
 * nunca el SDK de Google directamente. Esto facilita migrar a otra base de
 * datos en el futuro sin tocar la lógica de negocio.
 *
 * Variables de entorno requeridas (ver .env.example y README.md):
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *  - GOOGLE_PRIVATE_KEY
 *  - GOOGLE_SHEET_ID
 */

const VARIABLES_REQUERIDAS = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEET_ID',
] as const;

function obtenerVariableEntorno(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim().length === 0) {
    throw new Error(
      `[googleSheets] Falta configurar la variable de entorno "${nombre}". ` +
        'Revisa el panel de Environment Variables en Vercel (o tu archivo .env.local).',
    );
  }
  return valor;
}

function validarVariablesEntorno(): void {
  for (const nombre of VARIABLES_REQUERIDAS) {
    obtenerVariableEntorno(nombre);
  }
}

export function obtenerIdSpreadsheet(): string {
  return obtenerVariableEntorno('GOOGLE_SHEET_ID');
}

// Cache del cliente autenticado a través de invocaciones "warm" de la misma
// función serverless (Vercel reutiliza el contenedor entre invocaciones).
let clienteSheetsCache: sheets_v4.Sheets | null = null;

/**
 * Crea (o reutiliza) un cliente autenticado de la API de Google Sheets.
 *
 * IMPORTANTE sobre GOOGLE_PRIVATE_KEY: en el panel de Vercel, si la llave se
 * pega como una sola línea, los saltos de línea suelen llegar como el texto
 * literal "\n" en vez de un salto real. Por eso se hace el `.replace()` de
 * abajo. Si pegas la llave completa con saltos de línea reales (recomendado
 * en Vercel, que soporta multilínea en el textarea), el replace es un no-op
 * seguro.
 */
export async function obtenerClienteSheets(): Promise<sheets_v4.Sheets> {
  if (clienteSheetsCache) {
    return clienteSheetsCache;
  }

  validarVariablesEntorno();

  const email = obtenerVariableEntorno('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const llavePrivada = obtenerVariableEntorno('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: llavePrivada,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  try {
    await auth.authorize();
  } catch (error) {
    console.error('[googleSheets] Falló la autenticación con la Service Account de Google:', error);
    throw new Error(
      'No fue posible autenticar con Google Sheets. Verifica GOOGLE_SERVICE_ACCOUNT_EMAIL, ' +
        'GOOGLE_PRIVATE_KEY y que la hoja esté compartida con ese correo como Editor.',
    );
  }

  clienteSheetsCache = google.sheets({ version: 'v4', auth });
  return clienteSheetsCache;
}

/** Fila cruda de la hoja junto con su número de fila real (1-indexed) en el spreadsheet. */
export interface FilaConNumero {
  numeroFila: number;
  valores: string[];
}

/**
 * Lee un rango y devuelve solo los valores (sin número de fila).
 * Ej: `leerRango('Citas!A2:H')`
 */
export async function leerRango(rango: string): Promise<string[][]> {
  const sheets = await obtenerClienteSheets();
  const spreadsheetId = obtenerIdSpreadsheet();

  try {
    const respuesta = await sheets.spreadsheets.values.get({ spreadsheetId, range: rango });
    return respuesta.data.values ?? [];
  } catch (error) {
    console.error(`[googleSheets] Error leyendo el rango "${rango}":`, error);
    throw new Error(`No fue posible leer datos de Google Sheets (rango: ${rango}).`);
  }
}

/**
 * Lee un rango y adjunta el número de fila real de cada elemento, asumiendo
 * que `rango` inicia en la fila `filaInicial` (útil para poder actualizar
 * después una celda específica sin volver a buscarla).
 *
 * Ej: `leerRangoConNumeroFila('Citas!A2:H', 2)`
 */
export async function leerRangoConNumeroFila(
  rango: string,
  filaInicial: number,
): Promise<FilaConNumero[]> {
  const valores = await leerRango(rango);
  return valores.map((valores, indice) => ({
    numeroFila: filaInicial + indice,
    valores,
  }));
}

/**
 * Inserta una nueva fila al final de la hoja indicada por `rango` (ej. "Citas!A:H").
 * Usa `insertDataOption: INSERT_ROWS` para no sobreescribir datos existentes.
 */
export async function agregarFila(rango: string, valores: (string | number)[]): Promise<void> {
  const sheets = await obtenerClienteSheets();
  const spreadsheetId = obtenerIdSpreadsheet();

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: rango,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [valores] },
    });
  } catch (error) {
    console.error(`[googleSheets] Error agregando fila en "${rango}":`, error);
    throw new Error('No fue posible guardar el registro en Google Sheets.');
  }
}

/** Actualiza el valor de una celda o rango puntual, ej: `actualizarCelda('Citas!H15', 'Cancelada')`. */
export async function actualizarCelda(rango: string, valor: string): Promise<void> {
  const sheets = await obtenerClienteSheets();
  const spreadsheetId = obtenerIdSpreadsheet();

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rango,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[valor]] },
    });
  } catch (error) {
    console.error(`[googleSheets] Error actualizando celda "${rango}":`, error);
    throw new Error('No fue posible actualizar el registro en Google Sheets.');
  }
}

/**
 * Actualiza varias celdas contiguas de UNA fila en una sola llamada, ej:
 * `actualizarFila('Consultorios!B5:F5', ['Clínica Sonrisas', '871-123-4567', ...])`.
 *
 * Usada por flujos "upsert" en el lugar (una fila por entidad, ej.
 * "Consultorios" con una fila por `id_medico`) donde reescribir toda la fila
 * de un solo golpe es más simple y más barato en cuota de la API que llamar
 * `actualizarCelda` columna por columna.
 */
export async function actualizarFila(rango: string, valores: (string | number)[]): Promise<void> {
  const sheets = await obtenerClienteSheets();
  const spreadsheetId = obtenerIdSpreadsheet();

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rango,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [valores] },
    });
  } catch (error) {
    console.error(`[googleSheets] Error actualizando fila "${rango}":`, error);
    throw new Error('No fue posible actualizar el registro en Google Sheets.');
  }
}
