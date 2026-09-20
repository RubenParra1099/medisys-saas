import { redirect } from 'next/navigation';
import { FormularioConsultorio } from '@/components/consultorio/FormularioConsultorio';
import { obtenerConsultorioPorIdMedico } from '@/utils/consultorioRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { ConfiguracionConsultorio } from '@/types';

/**
 * Ruta `/dashboard/consultorio` — "Mi Consultorio" (reemplaza el marcador
 * provisional gris "Pendiente de implementar").
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets la
 * pestaña "Consultorios" y busca la fila del médico en sesión (relación 1 a
 * 1 — ver `consultorioRepository.ts`). Si todavía no ha guardado nada, el
 * formulario simplemente arranca vacío (con los horarios por defecto
 * 09:00-18:00) en vez de bloquear la pantalla.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché de los datos de contacto del consultorio.
 */
export const dynamic = 'force-dynamic';

export default async function MiConsultorioPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const consultorio = await obtenerConsultorioPorIdMedico(idMedico).catch((error) => {
    console.error('[MiConsultorioPage] No se pudo leer la pestaña "Consultorios" de Google Sheets:', error);
    return null as ConfiguracionConsultorio | null;
  });

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Mi Consultorio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Datos de contacto, dirección física y horario general de atención de tu consultorio.
        </p>
      </div>

      <FormularioConsultorio consultorioInicial={consultorio} />
    </main>
  );
}
