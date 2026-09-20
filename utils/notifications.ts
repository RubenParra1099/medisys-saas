import { Resend } from 'resend';
import type { Cita, Medico } from '@/types';
import { obtenerMedicoPorId } from '@/utils/medicosRepository';

/**
 * Módulo de alertas asíncronas ("The Talkie").
 *
 * Diseño clave: `enviarNotificacionesCitaConfirmada` NUNCA debe lanzar una
 * excepción que rompa el flujo del endpoint que la invoca. El endpoint de
 * booking la dispara con `.catch()` (fire-and-forget) para no retrasar la
 * respuesta al paciente ni fallar la reservación por un problema de
 * WhatsApp/correo. Cada sub-tarea maneja sus propios errores y se ejecutan
 * en paralelo con `Promise.allSettled`.
 */

// ---------------------------------------------------------------------------
// WhatsApp (placeholder estructurado — reemplaza la URL/payload por los de
// tu proveedor real: WhatsApp Cloud API de Meta, Twilio, Gupshup, etc.)
// ---------------------------------------------------------------------------

/**
 * Envía un mensaje de WhatsApp. Implementación placeholder vía `fetch` a un
 * endpoint genérico configurado por variables de entorno. No lanza errores
 * hacia arriba: registra en consola y continúa (una falla de WhatsApp no
 * debe tumbar la confirmación de la cita).
 */
export async function enviarWhatsApp(telefonoDestino: string, mensaje: string): Promise<void> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.warn(
      '[notifications] WhatsApp no está configurado (WHATSAPP_API_URL / WHATSAPP_API_TOKEN). Se omite el envío.',
    );
    return;
  }

  try {
    const respuesta = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      // Payload de ejemplo estilo WhatsApp Cloud API — ajusta al formato de tu proveedor.
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefonoDestino,
        type: 'text',
        text: { body: mensaje },
      }),
    });

    if (!respuesta.ok) {
      const textoError = await respuesta.text();
      throw new Error(`Respuesta HTTP ${respuesta.status}: ${textoError}`);
    }
  } catch (error) {
    console.error(`[notifications] Error enviando WhatsApp a ${telefonoDestino}:`, error);
    // Intencionalmente no relanzamos: ver nota de diseño arriba.
  }
}

// ---------------------------------------------------------------------------
// Correo electrónico (Resend)
// ---------------------------------------------------------------------------

let clienteResend: Resend | null = null;

function obtenerClienteResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notifications] RESEND_API_KEY no configurado. Se omite el envío de correo.');
    return null;
  }
  if (!clienteResend) {
    clienteResend = new Resend(apiKey);
  }
  return clienteResend;
}

/** Envía un correo HTML. No lanza: registra el error y continúa. */
export async function enviarCorreo(
  destinatario: string,
  asunto: string,
  html: string,
): Promise<void> {
  const resend = obtenerClienteResend();
  if (!resend) return;

  const remitente = process.env.RESEND_FROM_EMAIL ?? 'citas@tu-dominio.com';

  try {
    const { error } = await resend.emails.send({
      from: remitente,
      to: destinatario,
      subject: asunto,
      html,
    });

    if (error) {
      throw new Error(typeof error === 'string' ? error : error.message);
    }
  } catch (error) {
    console.error(`[notifications] Error enviando correo a ${destinatario}:`, error);
  }
}

/*
 * ALTERNATIVA con Nodemailer (SMTP propio, por si no usas Resend):
 *
 * import nodemailer from 'nodemailer';
 *
 * const transporter = nodemailer.createTransport({
 *   host: process.env.SMTP_HOST,
 *   port: Number(process.env.SMTP_PORT ?? 587),
 *   secure: false,
 *   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
 * });
 *
 * export async function enviarCorreoSmtp(destinatario: string, asunto: string, html: string) {
 *   try {
 *     await transporter.sendMail({
 *       from: process.env.SMTP_FROM_EMAIL,
 *       to: destinatario,
 *       subject: asunto,
 *       html,
 *     });
 *   } catch (error) {
 *     console.error(`[notifications] Error SMTP enviando a ${destinatario}:`, error);
 *   }
 * }
 */

// ---------------------------------------------------------------------------
// Plantillas HTML
// ---------------------------------------------------------------------------

function envolturaCorreo(contenido: string): string {
  return `
  <!DOCTYPE html>
  <html lang="es">
    <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background-color:#0f766e;padding:20px 32px;">
                  <span style="color:#ffffff;font-size:18px;font-weight:bold;">MediSys</span>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
                  ${contenido}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px;background-color:#f9fafb;color:#9ca3af;font-size:12px;">
                  Este es un mensaje automático, por favor no respondas a este correo.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function generarHtmlCorreoPaciente(cita: Cita, medico: Medico | null): string {
  const nombreMedico = medico?.nombre ?? 'el médico seleccionado';
  const especialidad = medico?.especialidad ? ` (${medico.especialidad})` : '';

  return envolturaCorreo(`
    <h2 style="margin:0 0 16px;color:#0f766e;">¡Tu cita está confirmada!</h2>
    <p>Hola <strong>${cita.nombre_paciente}</strong>, tu cita ha quedado registrada con los siguientes detalles:</p>
    <table role="presentation" width="100%" cellpadding="8" style="margin:16px 0;background-color:#f9fafb;border-radius:8px;">
      <tr><td style="color:#6b7280;">Médico</td><td><strong>${nombreMedico}${especialidad}</strong></td></tr>
      <tr><td style="color:#6b7280;">Fecha</td><td><strong>${cita.fecha}</strong></td></tr>
      <tr><td style="color:#6b7280;">Hora</td><td><strong>${cita.hora} hrs</strong></td></tr>
      <tr><td style="color:#6b7280;">Folio</td><td><strong>${cita.id_cita}</strong></td></tr>
    </table>
    <p>Si necesitas cancelar o reprogramar, contáctanos indicando tu folio.</p>
  `);
}

function generarHtmlCorreoMedico(cita: Cita, medico: Medico | null): string {
  return envolturaCorreo(`
    <h2 style="margin:0 0 16px;color:#0f766e;">Nueva cita agendada</h2>
    <p>Hola${medico?.nombre ? ` Dr(a). ${medico.nombre}` : ''}, tienes una nueva cita en tu agenda:</p>
    <table role="presentation" width="100%" cellpadding="8" style="margin:16px 0;background-color:#f9fafb;border-radius:8px;">
      <tr><td style="color:#6b7280;">Paciente</td><td><strong>${cita.nombre_paciente}</strong></td></tr>
      <tr><td style="color:#6b7280;">Teléfono</td><td><strong>${cita.telefono_paciente}</strong></td></tr>
      <tr><td style="color:#6b7280;">Correo</td><td><strong>${cita.correo_paciente}</strong></td></tr>
      <tr><td style="color:#6b7280;">Fecha</td><td><strong>${cita.fecha}</strong></td></tr>
      <tr><td style="color:#6b7280;">Hora</td><td><strong>${cita.hora} hrs</strong></td></tr>
      <tr><td style="color:#6b7280;">Folio</td><td><strong>${cita.id_cita}</strong></td></tr>
    </table>
  `);
}

// ---------------------------------------------------------------------------
// Orquestador — se invoca desde el endpoint de booking, sin bloquear la respuesta
// ---------------------------------------------------------------------------

/**
 * Dispara todas las notificaciones asociadas a una cita recién confirmada:
 * WhatsApp al paciente, correo al paciente, y correo al médico (si tiene
 * `correo_contacto` configurado). Se ejecutan en paralelo y ninguna falla
 * individual interrumpe a las demás.
 */
export async function enviarNotificacionesCitaConfirmada(cita: Cita): Promise<void> {
  const medico = await obtenerMedicoPorId(cita.id_medico).catch((error) => {
    console.error('[notifications] No se pudo obtener la información del médico:', error);
    return null;
  });

  const nombreMedico = medico?.nombre ?? 'tu médico';
  const mensajeWhatsApp =
    `Hola ${cita.nombre_paciente}! Tu cita con ${nombreMedico} quedó confirmada ` +
    `para el ${cita.fecha} a las ${cita.hora} hrs. Folio: ${cita.id_cita}.`;

  const tareas: Promise<void>[] = [
    enviarWhatsApp(cita.telefono_paciente, mensajeWhatsApp),
    enviarCorreo(
      cita.correo_paciente,
      'Confirmación de tu cita médica',
      generarHtmlCorreoPaciente(cita, medico),
    ),
  ];

  if (medico?.correo_contacto) {
    tareas.push(
      enviarCorreo(medico.correo_contacto, 'Nueva cita agendada', generarHtmlCorreoMedico(cita, medico)),
    );
  } else {
    console.warn(
      `[notifications] El médico ${cita.id_medico} no tiene "correo_contacto" configurado; no se le notificará por correo.`,
    );
  }

  const resultados = await Promise.allSettled(tareas);
  resultados.forEach((resultado, indice) => {
    if (resultado.status === 'rejected') {
      console.error(`[notifications] La tarea de notificación #${indice} falló:`, resultado.reason);
    }
  });
}

// ---------------------------------------------------------------------------
// Alertas del dashboard del médico ("The Talkie" — confirmar/cancelar)
// ---------------------------------------------------------------------------

/** Registra en consola cualquier tarea de notificación que falle, sin relanzar. */
async function registrarResultados(tareas: Promise<void>[], etiqueta: string): Promise<void> {
  const resultados = await Promise.allSettled(tareas);
  resultados.forEach((resultado, indice) => {
    if (resultado.status === 'rejected') {
      console.error(`[notifications] ${etiqueta} #${indice} falló:`, resultado.reason);
    }
  });
}

/**
 * Alerta al paciente cuando el MÉDICO confirma manualmente una cita
 * "Pendiente" desde el dashboard (distinta del correo de "reserva creada"
 * que ya se envía en `crear-cita/route.ts`). Mensaje pedido explícitamente
 * por el negocio: "Tu cita con el Dr. [Nombre] ha sido CONFIRMADA".
 */
export async function enviarAlertaCitaConfirmadaPorMedico(cita: Cita, nombreMedico: string): Promise<void> {
  const mensajeWhatsApp =
    `Hola ${cita.nombre_paciente}! Tu cita con el Dr. ${nombreMedico} ha sido CONFIRMADA ` +
    `para el ${cita.fecha} a las ${cita.hora} hrs. Folio: ${cita.id_cita}.`;

  const htmlCorreo = envolturaCorreo(`
    <h2 style="margin:0 0 16px;color:#008BEA;">¡Tu cita ha sido CONFIRMADA!</h2>
    <p>Hola <strong>${cita.nombre_paciente}</strong>, el Dr. ${nombreMedico} confirmó tu cita:</p>
    <table role="presentation" width="100%" cellpadding="8" style="margin:16px 0;background-color:#f9fafb;border-radius:8px;">
      <tr><td style="color:#6b7280;">Fecha</td><td><strong>${cita.fecha}</strong></td></tr>
      <tr><td style="color:#6b7280;">Hora</td><td><strong>${cita.hora} hrs</strong></td></tr>
      <tr><td style="color:#6b7280;">Folio</td><td><strong>${cita.id_cita}</strong></td></tr>
    </table>
  `);

  await registrarResultados(
    [
      enviarWhatsApp(cita.telefono_paciente, mensajeWhatsApp),
      enviarCorreo(cita.correo_paciente, 'Tu cita fue confirmada', htmlCorreo),
    ],
    'Alerta de confirmación',
  );
}

/**
 * Alerta al paciente cuando el médico cancela una cita desde el dashboard.
 * No pedida explícitamente en el requerimiento original, pero se agrega por
 * consistencia: el paciente siempre debe saber si su cita fue cancelada.
 */
export async function enviarAlertaCitaCanceladaPorMedico(cita: Cita, nombreMedico: string): Promise<void> {
  const mensajeWhatsApp =
    `Hola ${cita.nombre_paciente}, lamentamos informarte que tu cita con el Dr. ${nombreMedico} ` +
    `del ${cita.fecha} a las ${cita.hora} hrs fue CANCELADA. Contáctanos para reprogramar.`;

  const htmlCorreo = envolturaCorreo(`
    <h2 style="margin:0 0 16px;color:#dc2626;">Tu cita fue cancelada</h2>
    <p>Hola <strong>${cita.nombre_paciente}</strong>, tu cita con el Dr. ${nombreMedico} programada para el
      ${cita.fecha} a las ${cita.hora} hrs fue cancelada.</p>
    <p>Si deseas reprogramar, contáctanos o agenda una nueva cita desde nuestro portal.</p>
  `);

  await registrarResultados(
    [
      enviarWhatsApp(cita.telefono_paciente, mensajeWhatsApp),
      enviarCorreo(cita.correo_paciente, 'Tu cita fue cancelada', htmlCorreo),
    ],
    'Alerta de cancelación',
  );
}
