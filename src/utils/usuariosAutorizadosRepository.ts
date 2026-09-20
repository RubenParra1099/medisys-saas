import { agregarFila, leerRango } from '@/utils/googleSheets';
import type { InvitarUsuarioInput, RolUsuarioAutorizado, UsuarioAutorizado } from '@/types';

/**
 * Acceso de dominio a la pestaña "Usuarios_Autorizados" — vista "Correos
 * Autorizados".
 *
 * REQUISITO EN LA HOJA: debes crear manualmente en tu Google Sheet una
 * pestaña llamada exactamente "Usuarios_Autorizados" con estos encabezados
 * en la Fila 1, en este orden exacto:
 *
 *   id_autorizacion | id_medico_principal | correo_invitado | rol
 */

const RANGO_USUARIOS_AUTORIZADOS = 'Usuarios_Autorizados!A2:D';
const INDICE_ID_AUTORIZACION = 0;
const INDICE_ID_MEDICO_PRINCIPAL = 1;
const INDICE_CORREO_INVITADO = 2;
const INDICE_ROL = 3;

const PREFIJO_ID_AUTORIZACION = 'INV-';
const INTENTOS_MAXIMOS_ID_UNICO = 20;

function saneaRol(valor: string): RolUsuarioAutorizado {
  return valor.trim() === 'Socio' ? 'Socio' : 'Asistente';
}

function filaAUsuarioAutorizado(fila: string[]): UsuarioAutorizado {
  return {
    id_autorizacion: (fila[INDICE_ID_AUTORIZACION] ?? '').trim(),
    id_medico_principal: (fila[INDICE_ID_MEDICO_PRINCIPAL] ?? '').trim(),
    correo_invitado: (fila[INDICE_CORREO_INVITADO] ?? '').trim(),
    rol: saneaRol(fila[INDICE_ROL] ?? ''),
  };
}

/**
 * Genera un `id_autorizacion` con formato "INV-12345" (5 dígitos) que no
 * colisione con ninguno ya existente — mismo esquema colisión-verificada que
 * `generarIdPacienteUnico`/`generarIdTransaccionUnico`.
 */
async function generarIdAutorizacionUnico(): Promise<string> {
  const filas = await leerRango(RANGO_USUARIOS_AUTORIZADOS);
  const idsExistentes = new Set(filas.map((fila) => (fila[INDICE_ID_AUTORIZACION] ?? '').trim()));

  for (let intento = 0; intento < INTENTOS_MAXIMOS_ID_UNICO; intento += 1) {
    const sufijo = Math.floor(10000 + Math.random() * 90000); // siempre 5 dígitos (10000-99999)
    const idCandidato = `${PREFIJO_ID_AUTORIZACION}${sufijo}`;
    if (!idsExistentes.has(idCandidato)) return idCandidato;
  }

  throw new Error(
    `[usuariosAutorizadosRepository] No fue posible generar un id_autorizacion único tras ${INTENTOS_MAXIMOS_ID_UNICO} intentos.`,
  );
}

/**
 * Invita a un nuevo usuario (asistente o socio) al sistema del médico en
 * sesión. No valida que el correo no esté ya invitado — un mismo correo
 * podría, en teoría, tener dos invitaciones activas (ej. una como Asistente
 * y otra como Socio en dos consultorios distintos); la UI puede filtrar
 * duplicados exactos si se vuelve un problema real.
 */
export async function invitarUsuario(
  input: InvitarUsuarioInput,
  idMedicoPrincipal: string,
): Promise<UsuarioAutorizado> {
  const idAutorizacion = await generarIdAutorizacionUnico();

  const usuario: UsuarioAutorizado = {
    id_autorizacion: idAutorizacion,
    id_medico_principal: idMedicoPrincipal,
    correo_invitado: input.correoInvitado,
    rol: input.rol,
  };

  await agregarFila(RANGO_USUARIOS_AUTORIZADOS, [
    usuario.id_autorizacion,
    usuario.id_medico_principal,
    usuario.correo_invitado,
    usuario.rol,
  ]);

  console.log(
    `[usuariosAutorizadosRepository] Usuario invitado id_autorizacion="${idAutorizacion}" ` +
      `(id_medico_principal="${idMedicoPrincipal}", rol="${input.rol}").`,
  );

  return usuario;
}

/** Lista todos los usuarios autorizados por un médico principal. */
export async function listarUsuariosAutorizadosPorMedico(idMedicoPrincipal: string): Promise<UsuarioAutorizado[]> {
  const filas = await leerRango(RANGO_USUARIOS_AUTORIZADOS);
  return filas
    .filter((fila) => (fila[INDICE_ID_MEDICO_PRINCIPAL] ?? '').trim() === idMedicoPrincipal)
    .map(filaAUsuarioAutorizado);
}
