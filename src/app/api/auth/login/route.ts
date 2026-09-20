import { NextRequest, NextResponse } from 'next/server';
import { buscarCredencialesPorUsuario } from '@/utils/authRepository';
import { verificarPassword } from '@/utils/password';
import { configurarCookieSesion } from '@/utils/session';
import type { ApiRespuesta } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LoginInput {
  usuario: string;
  password: string;
}

const MENSAJE_ERROR_GENERICO = 'Usuario o contraseña incorrectos.';

const INTENTOS_MAXIMOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentosPorIp = new Map<string, { conteo: number; expiraEn: number }>();

function obtenerIpCliente(request: NextRequest): string {
  const encabezado = request.headers.get('x-forwarded-for');
  return encabezado?.split(',')[0]?.trim() || 'desconocida';
}

function excedioLimiteDeIntentos(ip: string): boolean {
  const ahora = Date.now();
  const registro = intentosPorIp.get(ip);
  if (!registro || registro.expiraEn < ahora) {
    intentosPorIp.set(ip, { conteo: 1, expiraEn: ahora + VENTANA_MS });
    return false;
  }
  registro.conteo += 1;
  return registro.conteo > INTENTOS_MAXIMOS;
}

function extraerUsuarioParaLog(body: unknown): string {
  if (typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).usuario === 'string') {
    return (body as Record<string, unknown>).usuario as string;
  }
  return '(no proporcionado)';
}

// (2) trim() explícito en usuario Y password.
function validarInput(body: unknown): { valido: boolean; data?: LoginInput } {
  if (typeof body !== 'object' || body === null) return { valido: false };
  const b = body as Record<string, unknown>;
  if (typeof b.usuario !== 'string' || b.usuario.trim().length === 0) return { valido: false };
  if (typeof b.password !== 'string' || b.password.trim().length === 0) return { valido: false };
  return { valido: true, data: { usuario: b.usuario.trim(), password: b.password.trim() } };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<{ id_medico: string }>>> {
  try {
    const ip = obtenerIpCliente(request);
    if (excedioLimiteDeIntentos(ip)) {
      return NextResponse.json(
        { ok: false, error: 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.' },
        { status: 429 },
      );
    }

    let bodyCrudo: unknown;
    try {
      bodyCrudo = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' }, { status: 400 });
    }

    const { valido, data } = validarInput(bodyCrudo);

    // (1) Diagnóstico solicitado: nunca se registra la contraseña ni su hash
    // en texto plano — sería la misma fuga que este módulo evita.
    console.log(
      `[POST /api/auth/login] Intento recibido — usuario="${extraerUsuarioParaLog(bodyCrudo)}", ` +
        `password recibido=${valido ? 'sí' : 'no o vacío'}.`,
    );

    if (!valido || !data) {
      return NextResponse.json({ ok: false, error: 'Usuario y contraseña son requeridos.' }, { status: 400 });
    }

    // El detalle de qué filas/columnas se leyeron vive en authRepository.ts.
    const credencial = await buscarCredencialesPorUsuario(data.usuario);
    if (!credencial) {
      console.log(`[POST /api/auth/login] Sin coincidencia para usuario="${data.usuario}".`);
      return NextResponse.json({ ok: false, error: MENSAJE_ERROR_GENERICO }, { status: 401 });
    }

    const passwordValido = await verificarPassword(data.password, credencial.password_hash);
    console.log(
      `[POST /api/auth/login] Usuario encontrado (id_medico="${credencial.id_medico}"). Contraseña válida=${passwordValido}.`,
    );

    if (!passwordValido) {
      return NextResponse.json({ ok: false, error: MENSAJE_ERROR_GENERICO }, { status: 401 });
    }

    // (3) Cookie robusta, independiente de cualquier DEMO_*: se firma con
    // HMAC (SESSION_SECRET) el id_medico resuelto desde la hoja. DEMO_ID_MEDICO
    // ya no existe en ningún archivo del proyecto.
    const respuesta = NextResponse.json({ ok: true, data: { id_medico: credencial.id_medico } }, { status: 200 });
    configurarCookieSesion(respuesta, credencial.id_medico);
    console.log(`[POST /api/auth/login] Cookie de sesión configurada para id_medico="${credencial.id_medico}".`);
    return respuesta;
  } catch (error) {
    console.error('[POST /api/auth/login] Error inesperado:', error);
    return NextResponse.json({ ok: false, error: 'Ocurrió un error interno al iniciar sesión. Intenta de nuevo.' }, { status: 500 });
  }
}
