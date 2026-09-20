import { NextRequest, NextResponse } from 'next/server';
import { crearRegistroHistorial } from '@/utils/historialClinicoRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, CrearRegistroHistorialInput, RegistroHistorialClinico } from '@/types';

/**
 * POST /api/historial/crear
 *
 * Inserta una nueva nota de evolución en la pestaña "Historiales_Clinicos"
 * de Google Sheets (ver `historialClinicoRepository.ts` para el detalle de
 * columnas) y devuelve el registro completo ya creado.
 *
 * Body esperado:
 *   { "idPaciente": string, "motivoConsulta": string, "diagnostico": string,
 *     "tratamientoSugerido": string, "notasPrivadas"?: string }
 *
 * SEGURIDAD: protegido por sesión — igual que el resto de `/api/*` de este
 * proyecto, `id_medico` se resuelve SIEMPRE de la cookie de sesión firmada
 * (`obtenerIdMedicoSesion()`), nunca de un valor que el cliente pudiera
 * mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validarInput(body: unknown): { valido: boolean; error?: string; data?: CrearRegistroHistorialInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPaciente !== 'string' || b.idPaciente.trim().length === 0) {
    return { valido: false, error: 'idPaciente es requerido.' };
  }

  if (typeof b.motivoConsulta !== 'string' || b.motivoConsulta.trim().length < 3) {
    return { valido: false, error: 'motivoConsulta es requerido (mínimo 3 caracteres).' };
  }

  if (typeof b.diagnostico !== 'string' || b.diagnostico.trim().length < 3) {
    return { valido: false, error: 'diagnostico es requerido (mínimo 3 caracteres).' };
  }

  if (typeof b.tratamientoSugerido !== 'string' || b.tratamientoSugerido.trim().length < 3) {
    return { valido: false, error: 'tratamientoSugerido es requerido (mínimo 3 caracteres).' };
  }

  const notasPrivadas = typeof b.notasPrivadas === 'string' ? b.notasPrivadas.trim() : '';

  return {
    valido: true,
    data: {
      idPaciente: b.idPaciente.trim(),
      motivoConsulta: b.motivoConsulta.trim(),
      diagnostico: b.diagnostico.trim(),
      tratamientoSugerido: b.tratamientoSugerido.trim(),
      notasPrivadas,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<RegistroHistorialClinico>>> {
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

    const registroCreado = await crearRegistroHistorial(data, idMedico);

    return NextResponse.json({ ok: true, data: registroCreado }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/historial/crear] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al guardar la nota de evolución. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
