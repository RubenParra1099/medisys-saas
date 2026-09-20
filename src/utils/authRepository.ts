import { leerRango } from '@/utils/googleSheets';
import type { CredencialMedico } from '@/types';

/**
 * Acceso a las credenciales de login dentro de la pestaña "Medicos".
 *
 * DECISIÓN DE ARQUITECTURA (histórica): el requisito original pedía usar las
 * columnas K (usuario_login) y L (password_hash), pero esas dos columnas ya
 * estaban asignadas desde un módulo anterior a `cedula_profesional` (K) y
 * `direccion` (L) — ver `medicosRepository.ts`, `types/index.ts` y
 * `DoctorProfileCard.tsx`. Para no romper el perfil público del médico, las
 * credenciales se movieron a las columnas **N (usuario_login) y O
 * (password_hash)**, al final de la hoja.
 *
 * ⚠️ ADVERTENCIA DE SEGURIDAD ACTIVA: si tu hoja tiene usuario_login/password_hash
 * en K/L (en vez de N/O), esos MISMOS valores se están mostrando en este
 * momento en la página pública `/medicos/[id]` como "Cédula profesional" y
 * "Dirección" (ver DoctorProfileCard.tsx, líneas ~62 y ~70). Revisa esa
 * página y, si corresponde, mueve esos valores a N/O y borra K/L cuanto antes.
 *
 * Este archivo, para no dejarte bloqueado mientras migras, soporta AMBAS
 * ubicaciones: intenta primero N/O (el diseño seguro) y, si no encuentra
 * coincidencia ahí, cae a K/L como compatibilidad temporal — dejando un
 * `console.warn` cada vez que eso ocurre.
 *
 * Es DELIBERADAMENTE independiente de `medicosRepository.ts`: lee su propio
 * rango (`Medicos!A2:O`) y expone únicamente lo mínimo que necesita el login.
 * El tipo `CredencialMedico` vive en `src/types/index.ts` (importado arriba).
 */

const RANGO_CREDENCIALES = 'Medicos!A2:O';
// Índices dentro de cada fila del rango anterior (A=0, B=1, ...).
const INDICE_ID_MEDICO = 0;
const INDICE_USUARIO_LOGIN_LEGADO = 10; // columna K
const INDICE_PASSWORD_HASH_LEGADO = 11; // columna L
const INDICE_USUARIO_LOGIN = 13; // columna N (diseño actual, seguro)
const INDICE_PASSWORD_HASH = 14; // columna O (diseño actual, seguro)

/**
 * Busca las credenciales por `usuario_login` (comparación insensible a
 * mayúsculas/espacios). Devuelve `null` si no existe el usuario o si la fila
 * está mal configurada — nunca lanza por un usuario inexistente, solo por un
 * fallo real de conexión con Google Sheets (ver `leerRango`).
 */
export async function buscarCredencialesPorUsuario(usuario: string): Promise<CredencialMedico | null> {
  const usuarioNormalizado = usuario.trim().toLowerCase();
  if (!usuarioNormalizado) return null;

  const filas = await leerRango(RANGO_CREDENCIALES);
  console.log(
    `[authRepository] Buscando usuario_login="${usuarioNormalizado}" entre ${filas.length} filas de "Medicos".`,
  );

  for (const [indice, fila] of filas.entries()) {
    const numeroFilaSheet = indice + 2;
    const idMedico = (fila[INDICE_ID_MEDICO] ?? '').trim();

    const usuarioColN = (fila[INDICE_USUARIO_LOGIN] ?? '').trim();
    const passwordColO = (fila[INDICE_PASSWORD_HASH] ?? '').trim();
    const usuarioColK = (fila[INDICE_USUARIO_LOGIN_LEGADO] ?? '').trim();
    const passwordColL = (fila[INDICE_PASSWORD_HASH_LEGADO] ?? '').trim();

    console.log(
      `[authRepository] Fila ${numeroFilaSheet} (id_medico="${idMedico || '(vacío)'}"): ` +
        `N="${usuarioColN || '(vacío)'}" / O=${passwordColO ? `[presente, ${passwordColO.length} caracteres]` : '(vacío)'} · ` +
        `K="${usuarioColK || '(vacío)'}" / L=${passwordColL ? `[presente, ${passwordColL.length} caracteres]` : '(vacío)'}.`,
    );

    if (idMedico && usuarioColN.toLowerCase() === usuarioNormalizado && passwordColO) {
      console.log(`[authRepository] Coincidencia en columnas N/O — id_medico="${idMedico}".`);
      return { id_medico: idMedico, usuario_login: usuarioColN, password_hash: passwordColO };
    }

    if (idMedico && usuarioColK.toLowerCase() === usuarioNormalizado && passwordColL) {
      console.warn(
        `[authRepository] Coincidencia en columnas K/L (legado) para id_medico="${idMedico}". ` +
          'ADVERTENCIA: K/L también son "cedula_profesional"/"direccion" en el perfil público del médico — ' +
          `ese correo/contraseña podría estar visible en /medicos/${idMedico} ahora mismo. Muévelos a N/O y borra K/L.`,
      );
      return { id_medico: idMedico, usuario_login: usuarioColK, password_hash: passwordColL };
    }
  }

  console.log(`[authRepository] Ninguna fila coincide con usuario_login="${usuarioNormalizado}".`);
  return null;
}
