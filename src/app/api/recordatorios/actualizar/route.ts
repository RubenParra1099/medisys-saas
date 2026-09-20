import { NextRequest, NextResponse } from 'next/server';
import { actualizarConfiguracionRecordatorios } from '@/utils/medicosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ActualizarRecordatoriosInput, ApiRespuesta, ConfiguracionRecordatorios } from '@/types';

/**
 * POST /api/recordatorios/actualizar
 *
 * Sobrescribe la columna `configuracion_recordatorios` (JSON, columna P
 * opcional de "Medicos" — N/O están reservadas para las credenciales de
 * login y este endpoint nunca las toca) del médico en sesión. Cada
 * interruptor de la Mesa de Control de Recordatorios dispara este endpoint
 * de forma independiente
 * (auto-guardado al cambiar, sin botón "Guardar" explícito) — por eso el
 * body manda siempre el objeto de configuración COMPLETO, no un solo campo:
 * evita una condición de carrera donde dos togglazos casi simultáneos se
 * pisen entre sí.
 *
 * Body esperado:
 *   { "recordatorio24hActivo": boolean, "recordatorio2hActivo": boolean, "alertasAutomaticasActivas": boolean }
 *
 * SEGURIDAD: protegido por sesión — `id_medico` se resuelve SIEMPRE de la
 * cookie de sesión firmada (`obtenerIdMedicoSesion()`), nunca de un valor
 * que el cliente pudiera mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validarInput(body: unknown): { valido: boolean; error?: string; data?: ActualizarRecordatoriosInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.recordatorio24hActivo !== 'boolean') {
    return { valido: false, error: 'recordatorio24hActivo es requerido y debe ser booleano.' };
  }
  if (typeof b.recordatorio2hActivo !== 'boolean') {
    return { valido: false, error: 'recordatorio2hActivo es requerido y debe ser booleano.' };
  }
  if (typeof b.alertasAutomaticasActivas !== 'boolean') {
    return { valido: false, error: 'alertasAutomaticasActivas es requerido y debe ser booleano.' };
  }

  return {
    valido: true,
    data: {
      recordatorio24hActivo: b.recordatorio24hActivo,
      recordatorio2hActivo: b.recordatorio2hActivo,
      alertasAutomaticasActivas: b.alertasAutomaticasActivas,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<ConfiguracionRecordatorios>>> {
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

    const medicoActualizado = await actualizarConfiguracionRecordatorios(idMedico, data);
    if (!medicoActualizado) {
      return NextResponse.json(
        { ok: false, error: 'No se encontró tu perfil en la pestaña "Medicos" — completa tu perfil antes de configurar recordatorios.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/recordatorios/actualizar] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al guardar tus preferencias. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
