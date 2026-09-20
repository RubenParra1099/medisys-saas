import { NextRequest, NextResponse } from 'next/server';
import { buscarCredencialesPorUsuario } from '@/utils/authRepository';
import { esHashBcrypt, verificarPassword } from '@/utils/password';

/**
 * POST /api/debug/probar-login?secret=TU_DEBUG_SECRET
 * Body: { "usuario": "...", "password": "..." }
 *
 * Corre, dentro del runtime real de Vercel, exactamente la misma búsqueda de
 * credenciales que usa `POST /api/auth/login` (`buscarCredencialesPorUsuario`
 * + `verificarPassword`), pero devolviendo un diagnóstico paso a paso en vez
 * de solo "ok"/"error" — para saber SIN ADIVINAR si el problema es que no
 * encuentra la fila, que la encuentra en la columna equivocada, que la
 * contraseña no coincide, o que falta `SESSION_SECRET`.
 *
 * SEGURIDAD:
 *  - Mismo gate que `/api/debug/estado-sheets`: requiere `DEBUG_SECRET`
 *    configurado en Vercel y el query param `secret` igual a esa variable.
 *    Sin `DEBUG_SECRET`, este endpoint responde 404 (no existe).
 *  - `password` va en el body (POST), nunca en la URL, para no quedar en
 *    logs de acceso ni en el historial del navegador.
 *  - Nunca devuelve `password` ni `password_hash` — solo si la contraseña
 *    resultó válida (`true`/`false`) y si el valor guardado parece un hash
 *    bcrypt o texto plano.
 *  - Bórrala (o borra `DEBUG_SECRET` en Vercel) en cuanto termines de depurar.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProbarLoginInput {
  usuario: string;
  password: string;
}

function validarInput(body: unknown): { valido: boolean; data?: ProbarLoginInput } {
  if (typeof body !== 'object' || body === null) return { valido: false };
  const b = body as Record<string, unknown>;
  if (typeof b.usuario !== 'string' || b.usuario.trim().length === 0) return { valido: false };
  if (typeof b.password !== 'string' || b.password.trim().length === 0) return { valido: false };
  return { valido: true, data: { usuario: b.usuario.trim(), password: b.password.trim() } };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secretoConfigurado = process.env.DEBUG_SECRET;

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

  let bodyCrudo: unknown;
  try {
    bodyCrudo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' }, { status: 400 });
  }

  const { valido, data } = validarInput(bodyCrudo);
  if (!valido || !data) {
    return NextResponse.json({ ok: false, error: 'usuario y password son requeridos en el body.' }, { status: 400 });
  }

  const diagnosticos: Array<{ paso: string; ok: boolean; detalle: string }> = [];

  // --- 0. SESSION_SECRET configurado -------------------------------------
  const sessionSecretOk = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0);
  diagnosticos.push({
    paso: 'Variable SESSION_SECRET',
    ok: sessionSecretOk,
    detalle: sessionSecretOk
      ? 'Configurada — la cookie de sesión podrá firmarse si las credenciales coinciden.'
      : 'NO configurada en este entorno de Vercel: aunque las credenciales coincidan, el login fallará al ' +
        'intentar firmar la cookie (fallo cerrado, ver session.ts). Agrégala en Environment Variables.',
  });

  // --- 1. Búsqueda de la fila en "Medicos" (misma función que /api/auth/login) ---
  let idMedicoEncontrado: string | null = null;
  let passwordHashEncontrado: string | null = null;

  try {
    const credencial = await buscarCredencialesPorUsuario(data.usuario);
    if (!credencial) {
      diagnosticos.push({
        paso: 'Búsqueda de usuario_login en "Medicos"',
        ok: false,
        detalle:
          `No se encontró ninguna fila cuyo usuario_login (columnas N o, como fallback, K) coincida con ` +
          `"${data.usuario}". Revisa: (a) que el valor esté EXACTAMENTE en esa celda sin espacios extra, ` +
          `(b) que estés editando el mismo Google Sheet que GOOGLE_SHEET_ID apunta en Vercel (no una copia), ` +
          `y (c) los Runtime Logs de esta misma función en Vercel — authRepository.ts registra cada fila que ` +
          `escaneó y qué tenía en N/O y K/L.`,
      });
      return NextResponse.json({ ok: false, diagnosticos }, { status: 200 });
    }

    idMedicoEncontrado = credencial.id_medico;
    passwordHashEncontrado = credencial.password_hash;

    diagnosticos.push({
      paso: 'Búsqueda de usuario_login en "Medicos"',
      ok: true,
      detalle:
        `Fila encontrada — id_medico="${credencial.id_medico}". El valor guardado ` +
        `${esHashBcrypt(credencial.password_hash) ? 'ES un hash bcrypt ($2a$/$2b$/$2y$)' : 'es TEXTO PLANO (no un hash bcrypt)'} ` +
        `(${credencial.password_hash.length} caracteres). Nunca se muestra el valor real aquí.`,
    });
  } catch (error) {
    console.error('[POST /api/debug/probar-login] Error leyendo "Medicos":', error);
    diagnosticos.push({
      paso: 'Búsqueda de usuario_login en "Medicos"',
      ok: false,
      detalle:
        `Lanzó una excepción al leer Google Sheets: ${error instanceof Error ? error.message : String(error)}. ` +
        'Esto normalmente es GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_PRIVATE_KEY/GOOGLE_SHEET_ID mal configurados en ' +
        'este entorno — corre primero GET /api/debug/estado-sheets.',
    });
    return NextResponse.json({ ok: false, diagnosticos }, { status: 200 });
  }

  // --- 2. Verificación de la contraseña -----------------------------------
  const passwordValido = await verificarPassword(data.password, passwordHashEncontrado);
  diagnosticos.push({
    paso: 'Verificación de contraseña',
    ok: passwordValido,
    detalle: passwordValido
      ? `La contraseña recibida SÍ coincide con la guardada para id_medico="${idMedicoEncontrado}".`
      : `La contraseña recibida NO coincide con la guardada para id_medico="${idMedicoEncontrado}". Si el valor ` +
        'guardado es texto plano, revisa mayúsculas/espacios exactos en la celda de la columna O (o L).',
  });

  const todoOk = sessionSecretOk && passwordValido;

  return NextResponse.json(
    {
      ok: todoOk,
      mensaje: todoOk
        ? 'Las credenciales son válidas y la sesión podrá crearse — si el login real sigue fallando, el problema no está en la lectura de Sheets ni en la contraseña.'
        : 'Encontrado el paso exacto que falla arriba.',
      diagnosticos,
    },
    { status: 200 },
  );
}
