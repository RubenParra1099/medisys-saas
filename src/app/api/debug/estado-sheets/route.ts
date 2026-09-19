import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/debug/estado-sheets?secret=TU_DEBUG_SECRET
 *
 * Endpoint de diagnóstico PROTEGIDO que corre — dentro del propio runtime de
 * Vercel — las mismas pruebas que `scripts/test-conexion-sheets.mjs`, pero
 * contra las variables de entorno REALES de ese despliegue (Production o
 * Preview). Esto resuelve el caso más común de "en mi máquina funciona, en
 * Vercel me da 401/403": las variables en Vercel no son iguales a las de
 * `.env.local`, y este endpoint permite comprobarlo sin necesidad de acceso
 * al dashboard de logs de Vercel.
 *
 * SEGURIDAD:
 *  - Requiere el query param `secret` igual a la variable de entorno
 *    `DEBUG_SECRET`. Si `DEBUG_SECRET` no está configurada, el endpoint se
 *    autodesactiva (404) para no quedar abierto por accidente.
 *  - Nunca devuelve el valor de `GOOGLE_PRIVATE_KEY` ni de ningún secreto —
 *    solo longitudes, prefijos/sufijos cortos y códigos de error.
 *  - Recomendado: elimina esta ruta (o el valor de `DEBUG_SECRET` en Vercel)
 *    una vez resuelto el problema.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Diagnostico {
  paso: string;
  ok: boolean;
  detalle: string;
  causasProbables?: string[];
}

function extraerCodigo(error: unknown): number | undefined {
  const err = error as { response?: { status?: number }; code?: unknown };
  const codigo = err?.response?.status ?? err?.code;
  return typeof codigo === 'number' ? codigo : undefined;
}

function extraerMensaje(error: unknown): string {
  const err = error as {
    response?: { data?: { error?: { message?: string }; error_description?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.error_description ??
    err?.message ??
    String(error)
  );
}

function causasAuth(): string[] {
  return [
    'La llave privada (GOOGLE_PRIVATE_KEY en Vercel) está incompleta, truncada o mal escapada.',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL no corresponde a la llave configurada (se regeneró la llave y no se actualizó la variable).',
    'La Service Account fue eliminada, deshabilitada o le revocaron las llaves en Google Cloud Console.',
  ];
}

function causasApi(codigo: number | undefined): string[] {
  if (codigo === 403) {
    return [
      'El spreadsheet no está compartido con el correo de la Service Account como Editor.',
      'La Google Sheets API no está habilitada en el proyecto de Google Cloud.',
    ];
  }
  if (codigo === 404) {
    return ['GOOGLE_SHEET_ID no corresponde a ningún spreadsheet real (revisa que sea el ID, no la URL completa).'];
  }
  return ['Código HTTP inesperado — revisa el detalle del error.'];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secretoConfigurado = process.env.DEBUG_SECRET;

  // Autodesactivación: si no se configuró DEBUG_SECRET, el endpoint no existe.
  if (!secretoConfigurado) {
    return NextResponse.json(
      { ok: false, error: 'Endpoint de diagnóstico deshabilitado (DEBUG_SECRET no configurado).' },
      { status: 404 },
    );
  }

  const secretoRecibido = request.nextUrl.searchParams.get('secret');
  if (secretoRecibido !== secretoConfigurado) {
    return NextResponse.json({ ok: false, error: 'Secreto inválido o ausente.' }, { status: 401 });
  }

  const diagnosticos: Diagnostico[] = [];

  // --- 1. Variables de entorno ------------------------------------------
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const llaveRaw = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const emailOk = Boolean(email && email.trim().length > 0);
  diagnosticos.push({
    paso: 'Variable GOOGLE_SERVICE_ACCOUNT_EMAIL',
    ok: emailOk,
    detalle: emailOk
      ? `Definida (${email!.endsWith('.iam.gserviceaccount.com') ? 'formato válido' : 'formato inusual, revísala'}).`
      : 'No está definida en este entorno de Vercel.',
  });

  const llaveNormalizada = llaveRaw ? llaveRaw.replace(/\\n/g, '\n') : '';
  const llaveOk = Boolean(llaveRaw && llaveNormalizada.includes('BEGIN PRIVATE KEY'));
  diagnosticos.push({
    paso: 'Variable GOOGLE_PRIVATE_KEY',
    ok: llaveOk,
    detalle: llaveRaw
      ? llaveOk
        ? `Definida (${llaveNormalizada.length} caracteres, formato PEM detectado).`
        : `Definida pero NO contiene "BEGIN PRIVATE KEY" (${llaveNormalizada.length} caracteres) — probablemente se truncó al pegarla en Vercel.`
      : 'No está definida en este entorno de Vercel.',
  });

  const sheetIdOk = Boolean(sheetId && sheetId.trim().length > 0);
  diagnosticos.push({
    paso: 'Variable GOOGLE_SHEET_ID',
    ok: sheetIdOk,
    detalle: sheetIdOk ? `Definida: ${sheetId}` : 'No está definida en este entorno de Vercel.',
  });

  if (!emailOk || !llaveOk || !sheetIdOk) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Faltan o están mal formadas una o más variables de entorno en este despliegue de Vercel.',
        diagnosticos,
      },
      { status: 200 },
    );
  }

  // --- 2. Autenticación (JWT) --------------------------------------------
  const auth = new google.auth.JWT({
    email,
    key: llaveNormalizada,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  try {
    await auth.authorize();
    diagnosticos.push({
      paso: 'Autenticación con la Service Account (JWT)',
      ok: true,
      detalle: 'El email y la llave privada son válidos y coinciden.',
    });
  } catch (error) {
    diagnosticos.push({
      paso: 'Autenticación con la Service Account (JWT)',
      ok: false,
      detalle: `Falló (equivalente a 401 Unauthorized). Código: ${extraerCodigo(error) ?? '(error local de firma)'} — ${extraerMensaje(error)}`,
      causasProbables: causasAuth(),
    });
    return NextResponse.json(
      { ok: false, error: 'Falló la autenticación con Google.', diagnosticos },
      { status: 200 },
    );
  }

  // --- 3. Acceso al spreadsheet (metadata) -------------------------------
  const sheets = google.sheets({ version: 'v4', auth });
  let hojas: string[] = [];

  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'properties.title,sheets.properties.title',
    });

    hojas = (metadata.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((titulo): titulo is string => Boolean(titulo));

    const faltanPestanas = ['Medicos', 'Citas'].filter((nombre) => !hojas.includes(nombre));

    diagnosticos.push({
      paso: 'Acceso de lectura al spreadsheet',
      ok: true,
      detalle:
        `Acceso concedido a "${metadata.data.properties?.title}". Pestañas: ${hojas.join(', ') || '(ninguna)'}.` +
        (faltanPestanas.length > 0 ? ` ADVERTENCIA: no se encontró: ${faltanPestanas.join(', ')}.` : ''),
    });
  } catch (error) {
    const codigo = extraerCodigo(error);
    diagnosticos.push({
      paso: 'Acceso de lectura al spreadsheet',
      ok: false,
      detalle: `Falló (equivalente a ${codigo ?? '403/404'}). Código: ${codigo ?? '(desconocido)'} — ${extraerMensaje(error)}`,
      causasProbables: causasApi(codigo),
    });
    return NextResponse.json(
      { ok: false, error: 'Falló el acceso al spreadsheet.', diagnosticos },
      { status: 200 },
    );
  }

  // --- 4. Lectura real de datos -------------------------------------------
  try {
    const respuesta = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Medicos!A2:B2' });
    diagnosticos.push({
      paso: 'Lectura real de datos (Medicos!A2:B2)',
      ok: true,
      detalle: `Lectura exitosa. Filas obtenidas: ${(respuesta.data.values ?? []).length}.`,
    });
  } catch (error) {
    const codigo = extraerCodigo(error);
    diagnosticos.push({
      paso: 'Lectura real de datos (Medicos!A2:B2)',
      ok: false,
      detalle: `Falló. Código: ${codigo ?? '(desconocido)'} — ${extraerMensaje(error)}`,
      causasProbables: causasApi(codigo),
    });
    return NextResponse.json({ ok: false, error: 'Falló la lectura de datos.', diagnosticos }, { status: 200 });
  }

  return NextResponse.json(
    {
      ok: true,
      mensaje: 'Todo funciona correctamente en este entorno de Vercel.',
      diagnosticos,
    },
    { status: 200 },
  );
}
