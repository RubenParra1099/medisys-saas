import { NextRequest, NextResponse } from 'next/server';
import { crearMovimientoFinanciero } from '@/utils/saldosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, CrearMovimientoFinancieroInput, TipoMovimientoFinanciero } from '@/types';

/**
 * POST /api/saldos/crear
 *
 * Inserta un nuevo movimiento financiero (cargo por tratamiento o abono) en
 * la pestaña "Saldos" de Google Sheets (ver `saldosRepository.ts` para el
 * detalle de columnas) y devuelve su `id_transaccion` recién generado
 * (formato "TX-12345").
 *
 * Body esperado:
 *   { "idPaciente": string, "concepto": string, "tipo": "Presupuesto" | "Abono",
 *     "monto": number (> 0), "notas"?: string }
 *
 * SEGURIDAD: protegido por sesión — igual que `/api/pacientes/crear` y
 * `/api/odontograma/guardar`, `id_medico` se resuelve SIEMPRE de la cookie
 * de sesión firmada (`obtenerIdMedicoSesion()`), nunca de un valor que el
 * cliente pudiera mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPOS_VALIDOS: TipoMovimientoFinanciero[] = ['Presupuesto', 'Abono'];

interface CrearMovimientoResultado {
  idTransaccion: string;
}

function validarInput(body: unknown): { valido: boolean; error?: string; data?: CrearMovimientoFinancieroInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPaciente !== 'string' || b.idPaciente.trim().length === 0) {
    return { valido: false, error: 'idPaciente es requerido.' };
  }

  if (typeof b.concepto !== 'string' || b.concepto.trim().length < 2) {
    return { valido: false, error: 'concepto es requerido (mínimo 2 caracteres).' };
  }

  if (typeof b.tipo !== 'string' || !TIPOS_VALIDOS.includes(b.tipo as TipoMovimientoFinanciero)) {
    return { valido: false, error: 'tipo es requerido y debe ser "Presupuesto" o "Abono".' };
  }

  if (typeof b.monto !== 'number' || !Number.isFinite(b.monto) || b.monto <= 0) {
    return { valido: false, error: 'monto es requerido y debe ser un número mayor a 0.' };
  }

  const notas = typeof b.notas === 'string' ? b.notas.trim() : '';

  return {
    valido: true,
    data: {
      idPaciente: b.idPaciente.trim(),
      concepto: b.concepto.trim(),
      tipo: b.tipo as TipoMovimientoFinanciero,
      monto: b.monto,
      notas,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<CrearMovimientoResultado>>> {
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

    const movimientoCreado = await crearMovimientoFinanciero(data, idMedico);

    return NextResponse.json({ ok: true, data: { idTransaccion: movimientoCreado.id_transaccion } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/saldos/crear] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al registrar el movimiento. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
