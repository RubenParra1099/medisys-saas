#!/usr/bin/env node
/**
 * Script de diagnóstico: prueba la conexión a Google Sheets con las MISMAS
 * variables de entorno que usan las API routes, y traduce cualquier fallo a
 * una causa concreta (401 de autenticación vs. 403 de permisos vs. 404 de
 * spreadsheet incorrecto), en vez de solo mostrar el error crudo de Google.
 *
 * Uso:
 *   1. Trae las variables reales de Vercel a tu máquina:
 *        npx vercel env pull .env.local
 *      (o edita .env.local a mano con los mismos valores que tienes en Vercel)
 *   2. Instala dependencias (una sola vez): npm install
 *   3. Ejecuta:  npm run diagnostico:sheets
 *      (equivalente a: node scripts/test-conexion-sheets.mjs)
 *
 * IMPORTANTE: este script se conecta con las credenciales reales — córrelo
 * solo en tu máquina o en un entorno de confianza, nunca lo expongas como
 * endpoint público sin protección (ver src/app/api/debug/estado-sheets/route.ts
 * para la versión protegida que sí puede vivir en Vercel).
 */

import 'dotenv/config';
import { google } from 'googleapis';

const color = {
  verde: (t) => `\x1b[32m${t}\x1b[0m`,
  rojo: (t) => `\x1b[31m${t}\x1b[0m`,
  amarillo: (t) => `\x1b[33m${t}\x1b[0m`,
  gris: (t) => `\x1b[90m${t}\x1b[0m`,
};

const paso = (titulo) => console.log(`\n${color.gris('─'.repeat(60))}\n${titulo}`);
const ok = (msg) => console.log(`${color.verde('✔')} ${msg}`);
const fail = (msg) => console.log(`${color.rojo('✘')} ${msg}`);
const warn = (msg) => console.log(`${color.amarillo('⚠')} ${msg}`);

function extraerCodigo(error) {
  const codigo = error?.response?.status ?? error?.code;
  return typeof codigo === 'number' ? codigo : undefined;
}

function extraerMensaje(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.error_description ??
    error?.message ??
    String(error)
  );
}

function diagnosticarErrorAuth(error) {
  const codigo = extraerCodigo(error);
  const mensaje = extraerMensaje(error);
  console.log(`   Código: ${codigo ?? '(sin código HTTP, error local de firma)'} — ${mensaje}`);
  console.log(
    [
      '   Causas típicas de un 401 / fallo de autenticación:',
      '    - La llave privada está incompleta, truncada o mal escapada al pegarla en Vercel',
      '      (debe conservar las líneas "-----BEGIN PRIVATE KEY-----" / "-----END PRIVATE KEY-----").',
      '    - El GOOGLE_SERVICE_ACCOUNT_EMAIL no corresponde a la llave (se regeneró la llave en Google',
      '      Cloud y no se actualizó la variable de entorno).',
      '    - La Service Account fue eliminada, deshabilitada o le revocaron las llaves en Google Cloud Console.',
    ].join('\n'),
  );
}

function diagnosticarErrorApi(error) {
  const codigo = extraerCodigo(error);
  const mensaje = extraerMensaje(error);
  console.log(`   Código: ${codigo ?? '(desconocido)'} — ${mensaje}`);

  if (codigo === 403) {
    console.log(
      [
        '   Causas típicas de un 403 Forbidden:',
        '    - El spreadsheet NO está compartido con el correo de la Service Account',
        '      (ábrelo en Google Sheets → Compartir → agrega ese correo como Editor).',
        '    - La Google Sheets API no está habilitada en el proyecto de Google Cloud',
        '      (Google Cloud Console → APIs & Services → habilita "Google Sheets API").',
      ].join('\n'),
    );
  } else if (codigo === 404) {
    warn('   Causa típica de un 404: GOOGLE_SHEET_ID no corresponde a ningún spreadsheet real (revisa que copiaste el ID de la URL, no la URL completa).');
  }
}

async function main() {
  paso('1. Variables de entorno');

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const llaveRaw = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  let faltanVariables = false;

  if (!email) {
    fail('GOOGLE_SERVICE_ACCOUNT_EMAIL no está definida.');
    faltanVariables = true;
  } else {
    if (!email.endsWith('.iam.gserviceaccount.com')) {
      warn(`GOOGLE_SERVICE_ACCOUNT_EMAIL = "${email}" no tiene el formato usual de una Service Account.`);
    }
    ok(`GOOGLE_SERVICE_ACCOUNT_EMAIL definida: ${email}`);
  }

  if (!llaveRaw) {
    fail('GOOGLE_PRIVATE_KEY no está definida.');
    faltanVariables = true;
  } else {
    const llave = llaveRaw.replace(/\\n/g, '\n');
    if (!llave.includes('BEGIN PRIVATE KEY')) {
      fail('GOOGLE_PRIVATE_KEY no contiene "BEGIN PRIVATE KEY" — probablemente se truncó al copiarla.');
      faltanVariables = true;
    } else {
      ok(`GOOGLE_PRIVATE_KEY definida (${llave.length} caracteres, formato PEM detectado).`);
    }
  }

  if (!sheetId) {
    fail('GOOGLE_SHEET_ID no está definida.');
    faltanVariables = true;
  } else {
    ok(`GOOGLE_SHEET_ID definida: ${sheetId}`);
  }

  if (faltanVariables) {
    console.log('\nCorrige las variables de entorno faltantes/incompletas antes de continuar.\n');
    process.exitCode = 1;
    return;
  }

  paso('2. Autenticando con la Service Account (JWT)');

  const auth = new google.auth.JWT({
    email,
    key: llaveRaw.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  try {
    await auth.authorize();
    ok('Autenticación exitosa: el email y la llave privada son válidos y coinciden.');
  } catch (error) {
    fail('Falló la autenticación (esto es lo que normalmente se ve como 401 Unauthorized).');
    diagnosticarErrorAuth(error);
    process.exitCode = 1;
    return;
  }

  paso('3. Verificando acceso de lectura al spreadsheet');

  const sheets = google.sheets({ version: 'v4', auth });

  let hojas = [];
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'properties.title,sheets.properties.title',
    });

    hojas = (metadata.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean);
    ok(`Acceso concedido al spreadsheet: "${metadata.data.properties?.title}".`);
    console.log(`   Pestañas encontradas: ${hojas.join(', ') || '(ninguna)'}`);

    if (!hojas.includes('Medicos')) warn('No se encontró una pestaña llamada exactamente "Medicos".');
    if (!hojas.includes('Citas')) warn('No se encontró una pestaña llamada exactamente "Citas".');
  } catch (error) {
    fail('Falló la lectura del spreadsheet (esto normalmente corresponde a un 403 o 404).');
    diagnosticarErrorApi(error);
    process.exitCode = 1;
    return;
  }

  paso('4. Probando una lectura real (Medicos!A2:B2)');

  try {
    const respuesta = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Medicos!A2:B2' });
    ok(`Lectura exitosa. Filas obtenidas: ${(respuesta.data.values ?? []).length}.`);
  } catch (error) {
    fail('Falló la lectura del rango "Medicos!A2:B2".');
    diagnosticarErrorApi(error);
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n${color.verde('Todo funciona correctamente.')} Si en Vercel sigues viendo 401/403, compara estas mismas ` +
      'variables con las que tienes en Project Settings → Environment Variables (ambiente Production) — ' +
      'es común que Vercel tenga valores distintos a tu .env.local.\n',
  );
}

main().catch((error) => {
  console.error('\nError inesperado ejecutando el diagnóstico:', error);
  process.exitCode = 1;
});
