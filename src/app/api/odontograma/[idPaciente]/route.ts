import { NextRequest, NextResponse } from 'next/server';
import { obtenerUltimoOdontogramaPorPaciente } from '@/utils/odontogramaRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta } from '@/types';
import type { EstadoOdontograma } from '@/components/odontograma/tipos';

/**
 * GET /api/odontograma/:idPaciente
 *
 * Devuelve el último odontograma guardado de un paciente (o `data: null` si
 * nunca se ha guardado uno). Se usa desde dos lugares:
 *
 *  1. Indirectamente NO — la carga inicial de la página (`page.tsx`, Server
 *     Component) llama directo a `obtenerUltimoOdontogramaPorPaciente()` sin
 *     pasar por HTTP, por eficiencia.
 *  2. `OdontogramaModule.tsx` (cliente) SÍ llama a esta ruta cuando el
 *     dentista cambia de paciente desde el buscador — como esa selección
 *     ocurre sin navegación (no hay recarga de página), es la única forma de
 *     traer el historial de ESE paciente sin recargar todo `/dashboard/odontograma`.
 *
 * SEGURIDAD: protegido por sesión, igual que el resto del panel — sin
 * cookie de sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ConsultarOdontogramaResultado {
  estado: EstadoOdontograma;
  fecha: string;
  notasEvolucion: string;
}

interface ContextoRuta {
  params: { idPaciente: string };
}

export async function GET(
  _request: NextRequest,
  { params }: ContextoRuta,
): Promise<NextResponse<ApiRespuesta<ConsultarOdontogramaResultado | null>>> {
  try {
    const idMedico = obtenerIdMedicoSesion();
    if (!idMedico) {
      return NextResponse.json({ ok: false, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' }, { status: 401 });
    }

    const idPaciente = decodeURIComponent(params.idPaciente ?? '').trim();
    if (!idPaciente) {
      return NextResponse.json({ ok: false, error: 'idPaciente es requerido en la ruta.' }, { status: 400 });
    }

    const registro = await obtenerUltimoOdontogramaPorPaciente(idPaciente);

    if (!registro) {
      // No es un error: simplemente este paciente no tiene odontograma guardado todavía.
      return NextResponse.json({ ok: true, data: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: { estado: registro.estado, fecha: registro.fecha, notasEvolucion: registro.notasEvolucion },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(`[GET /api/odontograma/${params.idPaciente}] Error inesperado:`, error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al consultar el odontograma. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
