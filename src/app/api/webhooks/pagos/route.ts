import { NextRequest, NextResponse } from 'next/server';

/**
 * STUB — POST /api/webhooks/pagos
 *
 * Pendiente de integrar con tu pasarela de pago (Stripe, Conekta, Mercado
 * Pago, etc.). Debe:
 *  1. Verificar la firma del webhook con el secreto de la pasarela.
 *  2. Ubicar al médico por metadata (ej. id_medico en el pago).
 *  3. Actualizar `estatus_pago` y `plan_suscripcion` en la pestaña "Medicos".
 */
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: 'Webhook no implementado todavía.' },
    { status: 501 },
  );
}
