import { cookies } from 'next/headers';

/**
 * Resuelve el `id_medico` de la sesión activa en el panel administrativo.
 *
 * TODO: reemplazar por autenticación real (NextAuth/Auth.js, Clerk, etc.) que
 * valide credenciales y devuelva el id_medico ligado a esa cuenta. Mientras
 * tanto, este helper resuelve el id_medico en este orden:
 *
 *  1. Cookie `id_medico_sesion` — útil en desarrollo para probar el panel con
 *     distintos médicos sin reconstruir el proyecto.
 *  2. Variable de entorno `DEMO_ID_MEDICO` — útil para desplegar una demo de
 *     un solo médico mientras no existe login.
 *
 * Si ninguno está presente, devuelve `null` y las páginas que dependen de la
 * sesión deben mostrar un estado "sin sesión" en vez de asumir un médico.
 */
export function obtenerIdMedicoSesion(): string | null {
  const idDesdeCookie = cookies().get('id_medico_sesion')?.value?.trim();
  if (idDesdeCookie) return idDesdeCookie;

  const idDesdeEnv = process.env.DEMO_ID_MEDICO?.trim();
  return idDesdeEnv || null;
}
