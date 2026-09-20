import { NextRequest, NextResponse } from 'next/server';
import { buscarCredencialesPorUsuario } from '@/utils/authRepository';
import { verificarPassword } from '@/utils/password';
import { configurarCookieSesion } from '@/utils/session';
import type { ApiRespuesta } from '@/types';

/**
 * POST /api/auth/login
 *
 * Recibe `{ usuario, password }`, busca las credenciales en la pestaña
 * "Medicos" (ver `authRepository.ts` — soporta columnas N/O y, como
 * compatibilidad temporal, K/L) y, si coinciden, configura la cookie de
 * sesión firmada (`id_medico_sesion`, 7 días) que
 * `src/app/(dashboard)/dashboard/layout.tsx` exige para dejar pasar al panel.
 *
 * Requiere runtime de Node.js: usa `crypto` (firma HMAC) y `bcryptjs`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LoginInput {
  usuario: string;
  password: string;
}

// Mensaje deliberadamente genérico: no distinguir "usuario no existe" de
// "contraseña incorrecta" evita que un atacante use el login para enumerar
// qué usuarios/correos existen en el sistema.
const MENSAJE_ERROR_GENERICO = 'Usuario o contraseña incorrectos.';

// --- Límite de intentos (best-effort, en memoria) --------------------------
// Nota de seguridad: vive en la memoria del proceso serverless — NO persiste
// entre cold starts ni se comparte entre instancias concurrentes de Vercel.
// Es una mitigación básica contra fuerza bruta trivial, no un rate limiter
// real. Para producción con tráfico serio, mover esto a Vercel KV / Upstash
// Redis (INCR + EXPIRE por IP) delante de este handler.
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

/** Extrae `usuario` del body crudo solo para el log — nunca para confiar en su tipo. */
function extraerUsuarioParaLog(body: unknown): string {
  if (typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).usuario === 'string') {
    return (body as Record<string, unknown>).usuario as string;
  }
  return '(no proporcionado)';
}

// (2) trim() explícito en usuario Y password: espacios/saltos de línea
// invisibles —típicamente pegados por accidente al escribir la contraseña,
// o al copiar el usuario desde otro lugar— ya no rompen la comparación.
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
      return NextResponse.json(
        { ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' },
        { status: 400 },
      );
    }

    const { valido, data } = validarInput(bodyCrudo);

    // (1) Diagnóstico solicitado — qué recibió el formulario. Deliberadamente
    // NUNCA se registra la contraseña ni su hash en texto plano: eso sería la
    // misma fuga de datos que este módulo existe para evitar. Solo se
    // registra el usuario recibido y si llegó una contraseña no vacía.
    console.log(
      `[POST /api/auth/login] Intento recibido — usuario="${extraerUsuarioParaLog(bodyCrudo)}", ` +
        `password recibido=${valido ? 'sí' : 'no o vacío'}.`,
    );

    if (!valido || !data) {
      return NextResponse.json({ ok: false, error: 'Usuario y contraseña son requeridos.' }, { status: 400 });
    }

    // El detalle de qué filas/columnas se leyeron de "Medicos" se registra
    // dentro de `buscarCredencialesPorUsuario` (authRepository.ts) — ahí vive
    // la lectura real de la hoja.
    const credencial = await buscarCredencialesPorUsuario(data.usuario);
    if (!credencial) {
      console.log(`[POST /api/auth/login] Sin coincidencia para usuario="${data.usuario}".`);
      return NextResponse.json({ ok: false, error: MENSAJE_ERROR_GENERICO }, { status: 401 });
    }

    const passwordValido = await verificarPassword(data.password, credencial.password_hash);
    console.log(
      `[POST /api/auth/login] Usuario encontrado (id_medico="${credencial.id_medico}"). ` +
        `Contraseña válida=${passwordValido}.`,
    );

    if (!passwordValido) {
      return NextResponse.json({ ok: false, error: MENSAJE_ERROR_GENERICO }, { status: 401 });
    }

    // (3) Cookie de sesión robusta e independiente de cualquier variable
    // DEMO_*: `configurarCookieSesion` firma con HMAC (SESSION_SECRET) el
    // `id_medico` que acaba de resolver `buscarCredencialesPorUsuario` desde
    // la hoja — no lee, ni le importa, ninguna variable de entorno DEMO_*
    // (esa lógica se eliminó por completo del proyecto en el módulo anterior;
    // ver `src/utils/session.ts`, que ya no la menciona en ninguna parte).
    const respuesta = NextResponse.json(
      { ok: true, data: { id_medico: credencial.id_medico } },
      { status: 200 },
    );
    configurarCookieSesion(respuesta, credencial.id_medico);
    console.log(`[POST /api/auth/login] Cookie de sesión configurada para id_medico="${credencial.id_medico}".`);
    return respuesta;
  } catch (error) {
    console.error('[POST /api/auth/login] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al iniciar sesión. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
