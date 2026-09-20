import { NextRequest, NextResponse } from 'next/server';

/**
 * STUB — GET /api/booking/disponibilidad?id_medico=...&fecha=YYYY-MM-DD
 *
 * Pendiente de implementar. Sugerencia de diseño:
 *  1. Leer `horario_config` del médico (medicosRepository.obtenerMedicoPorId).
 *  2. Generar los slots del día según `duracionCitaMinutos`.
 *  3. Leer "Citas" y filtrar por id_medico + fecha con estatus activo.
 *  4. Restar los horarios ya ocupados de los slots generados y devolver los libres.
 */
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: 'Endpoint no implementado todavía.' },
    { status: 501 },
  );
}
