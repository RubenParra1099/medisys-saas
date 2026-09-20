import { NextRequest, NextResponse } from 'next/server';
import { agregarFoto } from '@/utils/galeriaRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, FotoGaleria, SubirFotoGaleriaInput, TipoArchivoGaleria } from '@/types';

/**
 * POST /api/galeria/subir
 *
 * Inserta una nueva referencia de foto/radiografía en la pestaña
 * "Galeria_Clinica" de Google Sheets (ver `galeriaRepository.ts`). No existe
 * todavía infraestructura real de carga de archivos — tal como se pidió, se
 * SIMULA la carga: el repositorio genera una URL de placeholder
 * determinística (`https://picsum.photos/seed/<id_foto>/...`) en vez de
 * recibir/guardar un archivo real.
 *
 * Body esperado:
 *   { "idPaciente": string, "descripcion": string, "tipoArchivo": "Radiografia" | "Fotografia" }
 *
 * SEGURIDAD: protegido por sesión — igual que el resto de `/api/*` de este
 * proyecto, aunque "Galeria_Clinica" no tiene columna `id_medico` (así se
 * pidió), la sesión sigue siendo obligatoria: sin ella, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPOS_ARCHIVO_VALIDOS: TipoArchivoGaleria[] = ['Radiografia', 'Fotografia'];

function validarInput(body: unknown): { valido: boolean; error?: string; data?: SubirFotoGaleriaInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.idPaciente !== 'string' || b.idPaciente.trim().length === 0) {
    return { valido: false, error: 'idPaciente es requerido.' };
  }

  if (typeof b.descripcion !== 'string' || b.descripcion.trim().length < 3) {
    return { valido: false, error: 'descripcion es requerida (mínimo 3 caracteres).' };
  }

  if (typeof b.tipoArchivo !== 'string' || !TIPOS_ARCHIVO_VALIDOS.includes(b.tipoArchivo as TipoArchivoGaleria)) {
    return { valido: false, error: 'tipoArchivo debe ser "Radiografia" o "Fotografia".' };
  }

  return {
    valido: true,
    data: {
      idPaciente: b.idPaciente.trim(),
      descripcion: b.descripcion.trim(),
      tipoArchivo: b.tipoArchivo as TipoArchivoGaleria,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<FotoGaleria>>> {
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

    const fotoCreada = await agregarFoto(data);

    return NextResponse.json({ ok: true, data: fotoCreada }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/galeria/subir] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al subir la imagen. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
