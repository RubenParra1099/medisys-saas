import { leerRango } from '@/utils/googleSheets';

/**
 * Acceso a las credenciales de login dentro de la pestaña "Medicos".
 *
 * DECISIÓN DE ARQUITECTURA: el requisito original pedía usar las columnas
 * K (usuario_login) y L (password_hash), pero esas dos columnas ya estaban
 * asignadas desde un módulo anterior a `cedula_profesional` (K) y
 * `direccion` (L) — ver `medicosRepository.ts` y types/index.ts. Para no
 * romper el perfil público del médico, las credenciales se agregan en las
 * columnas **N (usuario_login) y O (password_hash)**, al final de la hoja.
 *
 * Este archivo es DELIBERADAMENTE independiente de `medicosRepository.ts`:
 * lee su propio rango (`Medicos!A2:O`) y expone únicamente lo mínimo que
 * necesita el login (`id_medico`, `usuario_login`, `password_hash`). Así,
 * el hash de la contraseña nunca pasa por el tipo `Medico` compartido con
 * el resto de la UI (dashboard, portal público) y no hay riesgo de que se
 * filtre a un componente de cliente por accidente.
 */
export interface CredencialMedico {
  id_medico: string;
  usuario_login: string;
  password_hash: string;
}

const RANGO_CREDENCIALES = 'Medicos!A2:O';
// Índices dentro de cada fila del rango anterior (A=0, B=1, ... N=13, O=14).
const INDICE_ID_MEDICO = 0;
const INDICE_USUARIO_LOGIN = 13;
const INDICE_PASSWORD_HASH = 14;

/**
 * Busca las credenciales por `usuario_login` (comparación insensible a
 * mayúsculas/espacios, ya que suele ser un correo). Devuelve `null` si no
 * existe el usuario o si la fila está mal configurada (sin id_medico o sin
 * password_hash) — nunca lanza por un usuario inexistente, solo por un
 * fallo real de conexión con Google Sheets (ver `leerRango`).
 */
export async function buscarCredencialesPorUsuario(usuario: string): Promise<CredencialMedico | null> {
  const usuarioNormalizado = usuario.trim().toLowerCase();
  if (!usuarioNormalizado) return null;

  const filas = await leerRango(RANGO_CREDENCIALES);

  for (const fila of filas) {
    const usuarioFila = (fila[INDICE_USUARIO_LOGIN] ?? '').trim();
    if (usuarioFila.toLowerCase() !== usuarioNormalizado) continue;

    const idMedico = (fila[INDICE_ID_MEDICO] ?? '').trim();
    const passwordHash = (fila[INDICE_PASSWORD_HASH] ?? '').trim();

    if (!idMedico || !passwordHash) {
      console.error(
        `[authRepository] La fila con usuario_login="${usuarioFila}" no tiene id_medico o password_hash configurado.`,
      );
      return null;
    }

    return { id_medico: idMedico, usuario_login: usuarioFila, password_hash: passwordHash };
  }

  return null;
}
