const INDICE_ID_MEDICO = 0;
const INDICE_USUARIO_LOGIN_LEGADO = 10; // K
const INDICE_PASSWORD_HASH_LEGADO = 11; // L
const INDICE_USUARIO_LOGIN = 13; // N (diseño seguro)
const INDICE_PASSWORD_HASH = 14; // O (diseño seguro)

export async function buscarCredencialesPorUsuario(usuario: string): Promise<CredencialMedico | null> {
  const usuarioNormalizado = usuario.trim().toLowerCase();
  if (!usuarioNormalizado) return null;

  const filas = await leerRango(RANGO_CREDENCIALES);
  console.log(`[authRepository] Buscando usuario_login="${usuarioNormalizado}" entre ${filas.length} filas.`);

  for (const [indice, fila] of filas.entries()) {
    const idMedico = (fila[INDICE_ID_MEDICO] ?? '').trim();
    const usuarioColN = (fila[INDICE_USUARIO_LOGIN] ?? '').trim();
    const passwordColO = (fila[INDICE_PASSWORD_HASH] ?? '').trim();
    const usuarioColK = (fila[INDICE_USUARIO_LOGIN_LEGADO] ?? '').trim();
    const passwordColL = (fila[INDICE_PASSWORD_HASH_LEGADO] ?? '').trim();

    console.log(
      `[authRepository] Fila ${indice + 2} (id_medico="${idMedico || '(vacío)'}"): ` +
        `N="${usuarioColN || '(vacío)'}"/O=${passwordColO ? `[${passwordColO.length} car.]` : '(vacío)'} · ` +
        `K="${usuarioColK || '(vacío)'}"/L=${passwordColL ? `[${passwordColL.length} car.]` : '(vacío)'}.`,
    );

    if (idMedico && usuarioColN.toLowerCase() === usuarioNormalizado && passwordColO) {
      return { id_medico: idMedico, usuario_login: usuarioColN, password_hash: passwordColO };
    }

    if (idMedico && usuarioColK.toLowerCase() === usuarioNormalizado && passwordColL) {
      console.warn(
        `[authRepository] Coincidencia en K/L (legado) para id_medico="${idMedico}" — ` +
          `revisa /medicos/${idMedico}, ese valor podría estar público. Muévelo a N/O.`,
      );
      return { id_medico: idMedico, usuario_login: usuarioColK, password_hash: passwordColL };
    }
  }

  return null;
}
