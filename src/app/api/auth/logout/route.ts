import { NextResponse } from 'next/server';
import { borrarCookieSesion } from '@/utils/session';
import type { ApiRespuesta } from '@/types';

/**
 * POST /api/auth/logout
 *
 * No se pidió explícitamente, pero un login sin una forma de cerrar sesión
 * deja al médico atrapado en su cuenta (o a ti, probando con distintos
 * médicos) — se agrega como contraparte natural de `/api/auth/login`.
 * Solo borra la cookie de sesión; no requiere body ni valida nada más.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse<ApiRespuesta<null>>> {
  const respuesta = NextResponse.json({ ok: true, data: null }, { status: 200 });
  borrarCookieSesion(respuesta);
  return respuesta;
}
