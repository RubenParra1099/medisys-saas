import { NextRequest, NextResponse } from 'next/server';
import { sanearEstadoOdontograma } from '@/components/odontograma/tipos';
import { guardarOdontograma } from '@/utils/odontogramaRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta } from '@/types';

/**
 * POST /api/odontograma/guardar
 *
 * Inserta un nuevo snapshot del odontograma del paciente activo en la
 * pestaña "Odontogramas" de Google Sheets (ver `odontogramaRepository.ts`
 * para el detalle de columnas y el modelo de "solo-anexar").
 *
 * Body esperado:
 *   { "idPaciente": string, "estado": EstadoOdontograma, "notasEvolucion"?: string }
 *
 * SEGURIDAD: protegido por sesión — usa `obtenerIdMedicoSesion()` (la misma
 * cookie firmada del guard de `(dashboard)/dashboard/layout.tsx`) para
 * resolver `id_medico`, en vez de confiar en cualquier valor que el cliente
 * pudiera mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GuardarOdontogramaResultado {
  idOdontograma: string;
}

interface GuardarOdontogramaBody {
  idPaciente: string;
  estado: unknown;
  notasEvolucion: string;
}

function validarInput(body: unknown): { valido: boolean; error?: string; data?: GuardarOdontogramaBody } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPaciente !== 'string' || b.idPaciente.trim().length === 0) {
    return { valido: false, error: 'idPaciente es requerido.' };
  }

  if (typeof b.estado !== 'object' || b.estado === null) {
    return { valido: false, error: 'estado es requerido y debe ser un objeto (mapa de piezas → superficies).' };
  }

  const notasEvolucion = typeof b.notasEvolucion === 'string' ? b.notasEvolucion.trim() : '';

  return {
    valido: true,
    data: { idPaciente: b.idPaciente.trim(), estado: b.estado, notasEvolucion },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<GuardarOdontogramaResultado>>> {
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

    // Se sanea el estado ANTES de guardar: un objeto con piezas mal formadas
    // (enviado por un cliente desincronizado o manipulado a mano) nunca debe
    // llegar a escribirse tal cual en la hoja.
    const estadoSaneado = sanearEstadoOdontograma(data.estado);

    const idOdontograma = await guardarOdontograma({
      idPaciente: data.idPaciente,
      idMedico,
      estado: estadoSaneado,
      notasEvolucion: data.notasEvolucion,
    });

    return NextResponse.json({ ok: true, data: { idOdontograma } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/odontograma/guardar] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al guardar el odontograma. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
