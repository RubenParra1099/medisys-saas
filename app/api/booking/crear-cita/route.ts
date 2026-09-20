import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { agregarFila, leerRango, leerRangoConNumeroFila, actualizarCelda } from '@/utils/googleSheets';
import { validarCrearCitaInput } from '@/utils/validation';
import { enviarNotificacionesCitaConfirmada } from '@/utils/notifications';
import type { ApiRespuesta, Cita, CrearCitaInput, EstatusCita } from '@/types';

/**
 * POST /api/booking/crear-cita
 *
 * Este endpoint debe correr en el runtime de Node.js (no Edge), porque
 * `googleapis` y el módulo `crypto` de Node no son compatibles con Edge Runtime.
 */
export const runtime = 'nodejs';
// Siempre dinámico: nunca debe cachear una decisión de disponibilidad.
export const dynamic = 'force-dynamic';

const NOMBRE_HOJA_CITAS = 'Citas';
// A2:H para omitir encabezados (fila 1). Columnas:
// A=id_cita B=id_medico C=nombre_paciente D=telefono_paciente
// E=correo_paciente F=fecha G=hora H=estatus
const RANGO_CITAS_SIN_ENCABEZADO = `${NOMBRE_HOJA_CITAS}!A2:H`;
const RANGO_CITAS_ESCRITURA = `${NOMBRE_HOJA_CITAS}!A:H`;
const PRIMERA_FILA_DE_DATOS = 2;

/**
 * NOTA DE DISEÑO — por qué existe `resolverColisionPostEscritura`:
 *
 * Google Sheets no ofrece transacciones ni locks a nivel de fila. En un
 * entorno serverless (cada invocación puede correr en una instancia distinta),
 * dos pacientes pueden dar clic al mismo tiempo, pasar ambos la validación
 * inicial (porque ninguno ve todavía la fila del otro) y ambos insertar una
 * fila para el mismo id_medico + fecha + hora.
 *
 * Estrategia usada (optimistic locking + compensación):
 *   1. Validamos colisión ANTES de insertar (rechaza el caso obvio, sin carrera).
 *   2. Insertamos nuestra fila con estatus "Pendiente".
 *   3. Volvemos a leer el rango y buscamos TODAS las filas que coincidan en
 *      id_medico + fecha + hora con estatus activo (Pendiente/Confirmada).
 *   4. Si hay más de una (hubo carrera), la fila insertada primero en la hoja
 *      (número de fila más bajo) gana; las demás se cancelan automáticamente.
 *   5. Si nuestra fila no fue la ganadora, respondemos 409 al cliente para que
 *      elija otro horario — su fila ya quedó marcada como "Cancelada".
 *
 * Esto no es tan fuerte como un lock real, pero cierra la ventana de carrera
 * a los milisegundos que toma el append + la relectura, que es exactamente
 * el caso de "doble clic simultáneo" que se pide resolver. Para una garantía
 * más estricta a mayor escala, se recomienda migrar esta validación a un
 * lock distribuido (ej. Vercel KV / Upstash Redis con SETNX) delante de
 * Google Sheets.
 */
async function resolverColisionPostEscritura(
  datos: CrearCitaInput,
  idCitaPropio: string,
): Promise<boolean> {
  const filas = await leerRangoConNumeroFila(RANGO_CITAS_SIN_ENCABEZADO, PRIMERA_FILA_DE_DATOS);

  const coincidencias = filas.filter(({ valores }) => {
    const [, id_medico, , , , fecha, hora, estatus] = valores;
    return (
      id_medico === datos.id_medico &&
      fecha === datos.fecha &&
      hora === datos.hora &&
      (estatus === 'Pendiente' || estatus === 'Confirmada')
    );
  });

  if (coincidencias.length <= 1) {
    return true;
  }

  const ganador = coincidencias.reduce((a, b) => (a.numeroFila < b.numeroFila ? a : b));
  const idGanador = ganador.valores[0];

  if (idGanador === idCitaPropio) {
    const perdedores = coincidencias.filter((f) => f.numeroFila !== ganador.numeroFila);
    await Promise.all(
      perdedores.map((f) =>
        actualizarCelda(`${NOMBRE_HOJA_CITAS}!H${f.numeroFila}`, 'Cancelada' satisfies EstatusCita),
      ),
    );
    return true;
  }

  const filaPropia = coincidencias.find((f) => f.valores[0] === idCitaPropio);
  if (filaPropia) {
    await actualizarCelda(`${NOMBRE_HOJA_CITAS}!H${filaPropia.numeroFila}`, 'Cancelada' satisfies EstatusCita);
  }
  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiRespuesta<Cita>>> {
  try {
    let bodyCrudo: unknown;
    try {
      bodyCrudo = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'El cuerpo de la solicitud no es un JSON válido.' },
        { status: 400 },
      );
    }

    const { valido, errores, data } = validarCrearCitaInput(bodyCrudo);
    if (!valido || !data) {
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos.', detalles: errores },
        { status: 400 },
      );
    }

    // 1. Validación estricta de colisión (caso sin condición de carrera).
    const filasExistentes = await leerRango(RANGO_CITAS_SIN_ENCABEZADO);
    const hayColision = filasExistentes.some((fila) => {
      const [, id_medico, , , , fecha, hora, estatus] = fila;
      return (
        id_medico === data.id_medico &&
        fecha === data.fecha &&
        hora === data.hora &&
        (estatus === 'Pendiente' || estatus === 'Confirmada')
      );
    });

    if (hayColision) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ese horario ya no está disponible. Por favor elige otro horario.',
        },
        { status: 409 },
      );
    }

    // 2. Generamos un id único y trazable (timestamp + sufijo aleatorio).
    const idCita = `CITA-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const nuevaCita: Cita = {
      id_cita: idCita,
      id_medico: data.id_medico,
      nombre_paciente: data.nombre_paciente,
      telefono_paciente: data.telefono_paciente,
      correo_paciente: data.correo_paciente,
      fecha: data.fecha,
      hora: data.hora,
      estatus: 'Pendiente',
    };

    await agregarFila(RANGO_CITAS_ESCRITURA, [
      nuevaCita.id_cita,
      nuevaCita.id_medico,
      nuevaCita.nombre_paciente,
      nuevaCita.telefono_paciente,
      nuevaCita.correo_paciente,
      nuevaCita.fecha,
      nuevaCita.hora,
      nuevaCita.estatus,
    ]);

    // 3. Verificación post-escritura: resuelve colisiones por "doble clic simultáneo".
    const somosGanadores = await resolverColisionPostEscritura(data, idCita);

    if (!somosGanadores) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Justo en este momento otro paciente reservó este mismo horario. Por favor elige otro horario disponible.',
        },
        { status: 409 },
      );
    }

    // 4. Notificaciones asíncronas — no bloquean ni retrasan la respuesta al cliente.
    enviarNotificacionesCitaConfirmada(nuevaCita).catch((error) => {
      console.error('[POST /api/booking/crear-cita] Error en notificaciones asíncronas:', error);
    });

    return NextResponse.json({ ok: true, data: nuevaCita }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/booking/crear-cita] Error inesperado:', error);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error interno al procesar la reservación. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
