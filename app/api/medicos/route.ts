import { NextResponse } from 'next/server';
import { listarMedicos } from '@/utils/medicosRepository';

/**
 * GET /api/medicos — listado público para el directorio/buscador.
 * Filtra a médicos con estatus_pago === 'activo' para no mostrar perfiles
 * de médicos con la suscripción vencida.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const medicos = await listarMedicos();
    const medicosActivos = medicos.filter((m) => m.estatus_pago === 'activo');
    return NextResponse.json({ ok: true, data: medicosActivos }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/medicos] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'No fue posible obtener el listado de médicos.' },
      { status: 500 },
    );
  }
}
