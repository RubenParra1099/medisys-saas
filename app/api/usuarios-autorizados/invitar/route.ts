import { NextRequest, NextResponse } from 'next/server';
import { invitarUsuario } from '@/utils/usuariosAutorizadosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, InvitarUsuarioInput, RolUsuarioAutorizado, UsuarioAutorizado } from '@/types';

/**
 * POST /api/usuarios-autorizados/invitar
 *
 * Inserta una nueva invitación en la pestaña "Usuarios_Autorizados" de
 * Google Sheets (ver `usuariosAutorizadosRepository.ts` para el detalle de
 * columnas) y devuelve el registro completo ya creado.
 *
 * Body esperado:
 *   { "correoInvitado": string, "rol": "Asistente" | "Socio" }
 *
 * SEGURIDAD: protegido por sesión — `id_medico_principal` se resuelve
 * SIEMPRE de la cookie de sesión firmada (`obtenerIdMedicoSesion()`), nunca
 * de un valor que el cliente pudiera mandar en el body. Sin sesión válida,
 * responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES_VALIDOS: RolUsuarioAutorizado[] = ['Asistente', 'Socio'];

function validarInput(body: unknown): { valido: boolean; error?: string; data?: InvitarUsuarioInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.correoInvitado !== 'string' || !REGEX_CORREO.test(b.correoInvitado.trim())) {
    return { valido: false, error: 'correoInvitado es requerido y debe tener un formato válido.' };
  }

  if (typeof b.rol !== 'string' || !ROLES_VALIDOS.includes(b.rol as RolUsuarioAutorizado)) {
    return { valido: false, error: 'rol es requerido y debe ser "Asistente" o "Socio".' };
  }

  return {
    valido: true,
    data: {
      correoInvitado: b.correoInvitado.trim().toLowerCase(),
      rol: b.rol as RolUsuarioAutorizado,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<UsuarioAutorizado>>> {
  try {
    const idMedico = obtenerIdMedicoSesion();
    if (!idMedico) {
      return NextResponse.json({ ok: false, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' }, { status: 401 });
    }

    let bodyCrudo: unknown;
    try {
      bodyCrudo = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' }, { status: 400 });
    }

    const { valido, error, data } = validarInput(bodyCrudo);
    if (!valido || !data) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    const usuarioCreado = await invitarUsuario(data, idMedico);

    return NextResponse.json({ ok: true, data: usuarioCreado }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/usuarios-autorizados/invitar] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al invitar al usuario. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
