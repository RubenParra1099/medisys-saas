import { NextRequest, NextResponse } from 'next/server';
import { actualizarEstatusCita } from '@/utils/citasRepository';
import { obtenerMedicoPorId } from '@/utils/medicosRepository';
import { enviarAlertaCitaCanceladaPorMedico, enviarAlertaCitaConfirmadaPorMedico } from '@/utils/notifications';
import type { ApiRespuesta, Cita, EstatusCita } from '@/types';

/**
 * POST /api/dashboard/actualizar-estatus
 *
 * Usada desde el dashboard del médico para confirmar o cancelar una cita
 * "Pendiente" con un clic. Actualiza la celda de estatus en Google Sheets
 * (vía `actualizarEstatusCita`, que internamente usa el helper `actualizarCelda`
 * del cliente JWT) y dispara — sin bloquear la respuesta — la alerta
 * correspondiente al paciente por WhatsApp/correo.
 *
 * Requiere runtime de Node.js: `googleapis` y `resend` no son compatibles
 * con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ESTATUS_PERMITIDOS: EstatusCita[] = ['Pendiente', 'Confirmada', 'Cancelada'];

interface ActualizarEstatusInput {
  id_cita: string;
  estatus: EstatusCita;
}

function validarInput(body: unknown): { valido: boolean; error?: string; data?: ActualizarEstatusInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.id_cita !== 'string' || b.id_cita.trim().length === 0) {
    return { valido: false, error: 'id_cita es requerido.' };
  }
  if (typeof b.estatus !== 'string' || !ESTATUS_PERMITIDOS.includes(b.estatus as EstatusCita)) {
    return { valido: false, error: `estatus debe ser uno de: ${ESTATUS_PERMITIDOS.join(', ')}.` };
  }

  return {
    valido: true,
    data: { id_cita: b.id_cita.trim(), estatus: b.estatus as EstatusCita },
  };
}

/**
 * Dispara la alerta "Talkie" correspondiente sin bloquear la respuesta al
 * médico: no se hace `await` sobre esta promesa desde el handler de POST.
 */
function dispararAlertaAsincrona(cita: Cita, estatus: EstatusCita): void {
  if (estatus !== 'Confirmada' && estatus !== 'Cancelada') return;

  obtenerMedicoPorId(cita.id_medico)
    .then((medico) => {
      const nombreMedico = medico?.nombre ?? 'tu médico';
      return estatus === 'Confirmada'
        ? enviarAlertaCitaConfirmadaPorMedico(cita, nombreMedico)
        : enviarAlertaCitaCanceladaPorMedico(cita, nombreMedico);
    })
    .catch((error) => {
      console.error('[POST /api/dashboard/actualizar-estatus] Error en notificación asíncrona:', error);
    });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<Cita>>> {
  try {
    let bodyCrudo: unknown;
    try {
      bodyCrudo = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' },
        { status: 400 },
      );
    }

    const { valido, error, data } = validarInput(bodyCrudo);
    if (!valido || !data) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    const citaActualizada = await actualizarEstatusCita(data.id_cita, data.estatus);
    if (!citaActualizada) {
      return NextResponse.json(
        { ok: false, error: `No se encontró ninguna cita con id_cita "${data.id_cita}".` },
        { status: 404 },
      );
    }

    // "The Talkie" — fire-and-forget: no se espera esta promesa antes de responder.
    dispararAlertaAsincrona(citaActualizada, data.estatus);

    return NextResponse.json({ ok: true, data: citaActualizada }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/dashboard/actualizar-estatus] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al actualizar la cita. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
