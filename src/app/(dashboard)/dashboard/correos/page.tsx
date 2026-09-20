import { redirect } from 'next/navigation';
import { ListaUsuariosAutorizados } from '@/components/correos/ListaUsuariosAutorizados';
import { listarUsuariosAutorizadosPorMedico } from '@/utils/usuariosAutorizadosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { UsuarioAutorizado } from '@/types';

/**
 * Ruta `/dashboard/correos` — "Correos Autorizados" (reemplaza el marcador
 * provisional gris "Pendiente de implementar").
 *
 * NOTA DE PRECISIÓN: el enunciado de este módulo pedía la ruta
 * `src/app/(dashboard)/dashboard/correos-autorizados/page.tsx` — esa ruta no
 * existe en el proyecto. El ítem real del `Sidebar` llamado "Correos
 * Autorizados" apunta a `/dashboard/correos` (`{ etiqueta: 'Correos
 * Autorizados', href: '/dashboard/correos', icono: Mail }`), que era el
 * stub gris genérico que sí existía — es esa ruta la que se reemplazó aquí,
 * para que quede conectada al `Sidebar` real y navegable de inmediato
 * (mismo criterio ya aplicado con `/dashboard/documentos` en el Cotizador).
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets la
 * pestaña "Usuarios_Autorizados", filtrada del lado del servidor por
 * `id_medico_principal` — nunca se manda al cliente la hoja completa de
 * invitaciones de todos los médicos.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché de la lista de usuarios con acceso al sistema.
 */
export const dynamic = 'force-dynamic';

export default async function CorreosAutorizadosPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const usuarios = await listarUsuariosAutorizadosPorMedico(idMedico).catch((error) => {
    console.error('[CorreosAutorizadosPage] No se pudo leer la pestaña "Usuarios_Autorizados" de Google Sheets:', error);
    return [] as UsuarioAutorizado[];
  });

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Correos Autorizados</h1>
        <p className="mt-1 text-sm text-slate-500">
          Asistentes o socios invitados que pueden acceder al sistema junto contigo.
        </p>
      </div>

      <ListaUsuariosAutorizados usuariosIniciales={usuarios} />
    </main>
  );
}
