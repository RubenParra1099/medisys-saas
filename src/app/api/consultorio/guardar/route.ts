import { NextRequest, NextResponse } from 'next/server';
import { guardarConsultorio } from '@/utils/consultorioRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, ConfiguracionConsultorio, DiaSemana, GuardarConsultorioInput } from '@/types';

/**
 * POST /api/consultorio/guardar
 *
 * Crea o actualiza (upsert) la fila del médico en sesión dentro de la
 * pestaña "Consultorios" de Google Sheets (ver `consultorioRepository.ts`
 * para el detalle de columnas).
 *
 * Body esperado:
 *   { "nombreClinica": string, "telefonoComercial": string, "direccionFisica": string,
 *     "diasAtencion": DiaSemana[], "horaApertura": string ("HH:mm"), "horaCierre": string ("HH:mm") }
 *
 * SEGURIDAD: protegido por sesión — igual que el resto de `/api/*` de este
 * proyecto, `id_medico` se resuelve SIEMPRE de la cookie de sesión firmada
 * (`obtenerIdMedicoSesion()`), nunca de un valor que el cliente pudiera
 * mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS_VALIDOS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function validarInput(body: unknown): { valido: boolean; error?: string; data?: GuardarConsultorioInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.nombreClinica !== 'string' || b.nombreClinica.trim().length < 2) {
    return { valido: false, error: 'nombreClinica es requerido (mínimo 2 caracteres).' };
  }

  if (typeof b.telefonoComercial !== 'string' || !REGEX_TELEFONO.test(b.telefonoComercial.trim())) {
    return {
      valido: false,
      error: 'telefonoComercial es requerido y debe tener un formato válido (7-20 caracteres, solo números, espacios, "+", "-" o paréntesis).',
    };
  }

  if (typeof b.direccionFisica !== 'string' || b.direccionFisica.trim().length < 5) {
    return { valido: false, error: 'direccionFisica es requerida (mínimo 5 caracteres).' };
  }

  if (
    !Array.isArray(b.diasAtencion) ||
    b.diasAtencion.length === 0 ||
    !b.diasAtencion.every((dia) => typeof dia === 'string' && DIAS_VALIDOS.includes(dia as DiaSemana))
  ) {
    return { valido: false, error: 'diasAtencion debe tener al menos un día válido (lunes a domingo).' };
  }

  if (typeof b.horaApertura !== 'string' || !REGEX_HORA.test(b.horaApertura.trim())) {
    return { valido: false, error: 'horaApertura debe tener el formato "HH:mm".' };
  }

  if (typeof b.horaCierre !== 'string' || !REGEX_HORA.test(b.horaCierre.trim())) {
    return { valido: false, error: 'horaCierre debe tener el formato "HH:mm".' };
  }

  if (b.horaCierre <= b.horaApertura) {
    return { valido: false, error: 'horaCierre debe ser posterior a horaApertura.' };
  }

  return {
    valido: true,
    data: {
      nombreClinica: b.nombreClinica.trim(),
      telefonoComercial: b.telefonoComercial.trim(),
      direccionFisica: b.direccionFisica.trim(),
      diasAtencion: b.diasAtencion as DiaSemana[],
      horaApertura: b.horaApertura.trim(),
      horaCierre: b.horaCierre.trim(),
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<ConfiguracionConsultorio>>> {
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

    const consultorioGuardado = await guardarConsultorio(idMedico, data);

    return NextResponse.json({ ok: true, data: consultorioGuardado }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/consultorio/guardar] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al guardar la configuración del consultorio. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
