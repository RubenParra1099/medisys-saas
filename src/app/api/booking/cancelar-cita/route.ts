import { NextRequest, NextResponse } from 'next/server';

/**
 * STUB — POST /api/booking/cancelar-cita
 *
 * Pendiente de implementar en una siguiente iteración. Sugerencia de diseño:
 *  1. Recibir `id_cita` (y opcionalmente un token/correo para verificar dueño).
 *  2. Leer "Citas" con `leerRangoConNumeroFila` para ubicar la fila exacta.
 *  3. Actualizar la columna H (estatus) a "Cancelada" con `actualizarCelda`.
 *  4. Disparar notificación de cancelación (reutilizar `notifications.ts`).
 */
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: 'Endpoint no implementado todavía.' },
    { status: 501 },
  );
}
