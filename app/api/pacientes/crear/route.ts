import { NextRequest, NextResponse } from 'next/server';
import { crearPaciente } from '@/utils/pacientesRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ApiRespuesta, CrearPacienteInput } from '@/types';

/**
 * POST /api/pacientes/crear
 *
 * Inserta un nuevo paciente en la pestaña "Pacientes" de Google Sheets (ver
 * `pacientesRepository.ts` para el detalle de columnas) y devuelve su
 * `id_paciente` recién generado (formato "PAC-12345"), listo para redirigir
 * al dentista directo a `/dashboard/odontograma?paciente=<id_paciente>`.
 *
 * Body esperado:
 *   { "nombreCompleto": string, "telefono": string, "correo"?: string,
 *     "fechaNacimiento": string ("YYYY-MM-DD"), "antecedentesMedicos"?: string }
 *
 * SEGURIDAD: protegido por sesión — igual que `/api/odontograma/guardar`,
 * `id_medico` se resuelve SIEMPRE de la cookie de sesión firmada
 * (`obtenerIdMedicoSesion()`), nunca de un valor que el cliente pudiera
 * mandar en el body. Sin sesión válida, responde 401.
 *
 * Requiere runtime de Node.js: `googleapis` no es compatible con Edge Runtime.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

interface CrearPacienteResultado {
  idPaciente: string;
}

function validarFechaNacimiento(valor: string): { valido: boolean; error?: string } {
  if (!REGEX_FECHA_ISO.test(valor)) {
    return { valido: false, error: 'fechaNacimiento debe tener el formato "YYYY-MM-DD".' };
  }
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return { valido: false, error: 'fechaNacimiento no es una fecha válida.' };
  }
  if (fecha.getTime() > Date.now()) {
    return { valido: false, error: 'fechaNacimiento no puede ser una fecha futura.' };
  }
  return { valido: true };
}

function validarInput(body: unknown): { valido: boolean; error?: string; data?: CrearPacienteInput } {
  if (typeof body !== 'object' || body === null) {
    return { valido: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.nombreCompleto !== 'string' || b.nombreCompleto.trim().length < 3) {
    return { valido: false, error: 'nombreCompleto es requerido (mínimo 3 caracteres).' };
  }

  if (typeof b.telefono !== 'string' || !REGEX_TELEFONO.test(b.telefono.trim())) {
    return { valido: false, error: 'telefono es requerido y debe tener un formato válido (7-20 caracteres, solo números, espacios, "+", "-" o paréntesis).' };
  }

  const correo = typeof b.correo === 'string' ? b.correo.trim() : '';
  if (correo && !REGEX_CORREO.test(correo)) {
    return { valido: false, error: 'correo no tiene un formato válido.' };
  }

  if (typeof b.fechaNacimiento !== 'string') {
    return { valido: false, error: 'fechaNacimiento es requerida.' };
  }
  const validacionFecha = validarFechaNacimiento(b.fechaNacimiento.trim());
  if (!validacionFecha.valido) {
    return { valido: false, error: validacionFecha.error };
  }

  const antecedentesMedicos = typeof b.antecedentesMedicos === 'string' ? b.antecedentesMedicos.trim() : '';

  return {
    valido: true,
    data: {
      nombreCompleto: b.nombreCompleto.trim(),
      telefono: b.telefono.trim(),
      correo,
      fechaNacimiento: b.fechaNacimiento.trim(),
      antecedentesMedicos,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<CrearPacienteResultado>>> {
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

    const pacienteCreado = await crearPaciente(data, idMedico);

    return NextResponse.json({ ok: true, data: { idPaciente: pacienteCreado.id_paciente } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/pacientes/crear] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al registrar el paciente. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
