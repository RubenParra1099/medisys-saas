import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

/**
 * Sesión del médico — cookie firmada con HMAC (reemplaza por completo al
 * placeholder `DEMO_ID_MEDICO`).
 *
 * Por qué firmada y no un id plano: la cookie es `httpOnly` (no la puede
 * leer/editar JavaScript del navegador), pero eso NO impide que alguien la
 * fabrique a mano con un cliente HTTP (`Cookie: id_medico_sesion=OTRO_ID`)
 * para intentar suplantar a otro médico. Firmar el valor con un secreto que
 * solo conoce el servidor (`SESSION_SECRET`) hace que una cookie forjada sin
 * la firma correcta se rechace de inmediato.
 *
 * TODO futuro: esto sigue siendo una sesión "sin estado" (el propio id_medico
 * viaja, firmado, dentro de la cookie). Es válido para este alcance, pero si
 * más adelante se necesita poder revocar sesiones activas (ej. "cerrar
 * sesión en todos los dispositivos"), hay que migrar a un id de sesión
 * opaco + almacenamiento server-side (Vercel KV/Redis) en vez de firmar el
 * id_medico directamente.
 */

export const NOMBRE_COOKIE_SESION = 'id_medico_sesion';
export const DURACION_COOKIE_SESION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

function obtenerSecretoSesion(): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.trim().length === 0) {
    throw new Error(
      '[session] Falta configurar la variable de entorno SESSION_SECRET (firma la cookie de sesión). ' +
        'Genera un valor largo y aleatorio, ej.: `openssl rand -hex 32`.',
    );
  }
  return secreto;
}

function firmar(idMedico: string): string {
  return crypto.createHmac('sha256', obtenerSecretoSesion()).update(idMedico).digest('hex');
}

/** Compara dos firmas hex en tiempo constante (evita timing attacks). */
function firmasCoinciden(firmaA: string, firmaB: string): boolean {
  const bufA = Buffer.from(firmaA, 'hex');
  const bufB = Buffer.from(firmaB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Construye el valor firmado `"id_medico.firmaHMAC"` para la cookie de sesión. */
function construirValorCookieSesion(idMedico: string): string {
  return `${idMedico}.${firmar(idMedico)}`;
}

/**
 * Resuelve el `id_medico` de la sesión activa, validando la firma HMAC de la
 * cookie. Devuelve `null` si no hay cookie, está corrupta, la firma no
 * coincide (cookie forjada o `SESSION_SECRET` rotado), o si `SESSION_SECRET`
 * no está configurado — en todos los casos se falla "cerrado" (se trata
 * como sesión inválida) en vez de confiar en un id sin firma.
 */
export function obtenerIdMedicoSesion(): string | null {
  const valor = cookies().get(NOMBRE_COOKIE_SESION)?.value;
  if (!valor) return null;

  const separador = valor.lastIndexOf('.');
  if (separador <= 0 || separador === valor.length - 1) return null;

  const idMedico = valor.slice(0, separador);
  const firmaRecibida = valor.slice(separador + 1);

  try {
    if (!firmasCoinciden(firmar(idMedico), firmaRecibida)) return null;
  } catch (error) {
    console.error('[session] No se pudo validar la firma de la cookie de sesión:', error);
    return null;
  }

  return idMedico;
}

/**
 * Configura la cookie de sesión firmada en una respuesta de Route Handler
 * (usada por `POST /api/auth/login`). Expira en 7 días.
 */
export function configurarCookieSesion(response: NextResponse, idMedico: string): void {
  response.cookies.set(NOMBRE_COOKIE_SESION, construirValorCookieSesion(idMedico), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_COOKIE_SESION_SEGUNDOS,
  });
}

/** Elimina la cookie de sesión (usada por `POST /api/auth/logout`). */
export function borrarCookieSesion(response: NextResponse): void {
  response.cookies.set(NOMBRE_COOKIE_SESION, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
