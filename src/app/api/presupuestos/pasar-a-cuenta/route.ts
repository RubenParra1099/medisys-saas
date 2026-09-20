import { NextRequest, NextResponse } from 'next/server';
import { actualizarEstatusPresupuesto, obtenerPresupuestoPorId } from '@/utils/presupuestosRepository';
import { crearMovimientoFinanciero } from '@/utils/saldosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, PresupuestoDetallado } from '@/types';

/**
 * POST /api/presupuestos/pasar-a-cuenta
 *
 * "Pasar a Estado de Cuenta": toma un presupuesto en `'Borrador'` y (1)
 * inserta un movimiento tipo `'Presupuesto'` por su `total_mxn` en la
 * pestaña "Saldos" (reutilizando `crearMovimientoFinanciero`, el mismo
 * repositorio del Cotizador de Presupuestos y Control de Abonos —
 * `/dashboard/documentos`) y (2) marca el presupuesto como `'Aceptado'`.
 *
 * Body esperado:
 *   { "idPresupuesto": string }
 *
 * SEGURIDAD: protegido por sesión — `id_medico` se resuelve SIEMPRE de la
 * cookie de sesión firmada, nunca del body. Además valida que el
 * presupuesto pertenezca al médico en sesión (404 si no) — un médico nunca
 * debe poder empujar a Saldos un presupuesto de otro consultorio.
 *
 * IDEMPOTENCIA: si el presupuesto ya está `'Aceptado'`, responde `409` sin
 * tocar nada — evita que un doble clic (o un reintento de red) genere DOS
 * cargos duplicados en "Saldos" para el mismo presupuesto.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validarInput(body: unknown): { valido: boolean; error?: string; idPresupuesto?: string } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPresupuesto !== 'string' || b.idPresupuesto.trim().length === 0) {
    return { valido: false, error: 'idPresupuesto es requerido.' };
  }

  return { valido: true, idPresupuesto: b.idPresupuesto.trim() };
}

/** Ej. "Endodoncia" si es un solo tratamiento, o "Presupuesto (3 tratamientos)" si son varios. */
function construirConceptoParaSaldos(presupuesto: PresupuestoDetallado): string {
  if (presupuesto.items.length === 1) {
    return presupuesto.items[0].tratamiento;
  }
  return `Presupuesto (${presupuesto.items.length} tratamientos)`;
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

    const { valido, error, idPresupuesto } = validarInput(bodyCrudo);
    if (!valido || !idPresupuesto) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    const presupuesto = await obtenerPresupuestoPorId(idPresupuesto);
    if (!presupuesto || presupuesto.id_medico !== idMedico) {
      return NextResponse.json({ ok: false, error: 'No se encontró ese presupuesto.' }, { status: 404 });
    }

    if (presupuesto.estatus === 'Aceptado') {
      return NextResponse.json(
        { ok: false, error: 'Este presupuesto ya fue pasado a Estado de Cuenta anteriormente.' },
        { status: 409 },
      );
    }

    if (presupuesto.total_mxn <= 0) {
      return NextResponse.json(
        { ok: false, error: 'El presupuesto no tiene un total mayor a $0.00 — revisa los tratamientos y el descuento.' },
        { status: 400 },
      );
    }

    await crearMovimientoFinanciero(
      {
        idPaciente: presupuesto.id_paciente,
        concepto: construirConceptoParaSaldos(presupuesto),
        tipo: 'Presupuesto',
        monto: presupuesto.total_mxn,
        notas: `Generado automáticamente desde el Cotizador de Presupuestos (${presupuesto.id_presupuesto}).`,
      },
      idMedico,
    );

    const presupuestoActualizado = await actualizarEstatusPresupuesto(idPresupuesto, 'Aceptado');

    return NextResponse.json({ ok: true, data: presupuestoActualizado ?? presupuesto }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/presupuestos/pasar-a-cuenta] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al pasar el presupuesto a Estado de Cuenta. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
