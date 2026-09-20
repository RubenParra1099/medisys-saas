import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Verificación de contraseñas para el login del médico.
 *
 * Soporta dos formatos en la columna O ("password_hash") de la pestaña
 * "Medicos", tal como pidió el requisito ("password_hash o texto plano
 * temporal para pruebas"):
 *
 *  1. Un hash bcrypt real (`$2a$`, `$2b$` o `$2y$`) — el camino de producción.
 *     Genera uno con `npm run generar:password-hash -- "la-contraseña"`.
 *  2. Texto plano — solo para pruebas mientras no se ha migrado la hoja.
 *     Se compara en tiempo constante para no filtrar por timing, pero sigue
 *     siendo texto plano en la hoja: no lo uses en producción real.
 */
const PATRON_HASH_BCRYPT = /^\$2[aby]\$/;

/** Compara dos strings sin filtrar su longitud/contenido por timing (hashea ambos primero). */
function compararTextoPlanoEnTiempoConstante(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function esHashBcrypt(valor: string): boolean {
  return PATRON_HASH_BCRYPT.test(valor);
}

export async function verificarPassword(passwordPlano: string, valorAlmacenado: string): Promise<boolean> {
  if (esHashBcrypt(valorAlmacenado)) {
    return bcrypt.compare(passwordPlano, valorAlmacenado);
  }

  // Camino temporal de pruebas — se avisa en cada uso para no olvidar migrarlo.
  console.warn(
    '[password] La columna "password_hash" no contiene un hash bcrypt: se está comparando como texto plano. ' +
      'Esto es solo para pruebas — genera un hash real con `npm run generar:password-hash -- "tu-contraseña"` ' +
      'y pégalo en la columna O de "Medicos" antes de ir a producción con médicos reales.',
  );
  return compararTextoPlanoEnTiempoConstante(passwordPlano, valorAlmacenado);
}
