import { NextRequest, NextResponse } from 'next/server';
import { crearPresupuesto } from '@/utils/presupuestosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, CrearPresupuestoInput, ItemPresupuesto, PresupuestoDetallado } from '@/types';

/**
 * POST /api/presupuestos/crear
 *
 * Inserta un nuevo presupuesto (siempre como `'Borrador'`) en la pestaña
 * "Presupuestos_Detallados" de Google Sheets (ver `presupuestosRepository.ts`
 * para el detalle de columnas) y devuelve el registro completo ya creado,
 * con `total_mxn` calculado del lado del servidor.
 *
 * Body esperado:
 *   { "idPaciente": string, "items": { tratamiento, diente, costoUnitario, cantidad }[], "descuento": number }
 *
 * SEGURIDAD: protegido por sesión — `id_medico` se resuelve SIEMPRE de la
 * cookie de sesión firmada (`obtenerIdMedicoSesion()`), nunca de un valor
 * que el cliente pudiera mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validarItem(item: unknown): item is ItemPresupuesto {
  if (typeof item !== 'object' || item === null) return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.tratamiento === 'string' &&
    i.tratamiento.trim().length > 0 &&
    typeof i.diente === 'string' &&
    typeof i.costoUnitario === 'number' &&
    Number.isFinite(i.costoUnitario) &&
    i.costoUnitario > 0 &&
    typeof i.cantidad === 'number' &&
    Number.isFinite(i.cantidad) &&
    i.cantidad > 0
  );
}

function validarInput(body: unknown): { valido: boolean; error?: string; data?: CrearPresupuestoInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPaciente !== 'string' || b.idPaciente.trim().length === 0) {
    return { valido: false, error: 'idPaciente es requerido.' };
  }

  if (!Array.isArray(b.items) || b.items.length === 0 || !b.items.every(validarItem)) {
    return {
      valido: false,
      error: 'items debe tener al menos un tratamiento válido (tratamiento, costoUnitario > 0 y cantidad > 0).',
    };
  }

  if (typeof b.descuento !== 'number' || !Number.isFinite(b.descuento) || b.descuento < 0) {
    return { valido: false, error: 'descuento es requerido y debe ser un número mayor o igual a 0.' };
  }

  return {
    valido: true,
    data: {
      idPaciente: b.idPaciente.trim(),
      items: (b.items as ItemPresupuesto[]).map((item) => ({
        tratamiento: item.tratamiento.trim(),
        diente: item.diente.trim(),
        costoUnitario: item.costoUnitario,
        cantidad: item.cantidad,
      })),
      descuento: b.descuento,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<PresupuestoDetallado>>> {
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

    const presupuestoCreado = await crearPresupuesto(data, idMedico);

    return NextResponse.json({ ok: true, data: presupuestoCreado }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/presupuestos/crear] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al guardar el presupuesto. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
