import { redirect } from 'next/navigation';
import { BellOff } from 'lucide-react';
import { MesaControlRecordatorios } from '@/components/recordatorios/MesaControlRecordatorios';
import { CONFIGURACION_RECORDATORIOS_POR_DEFECTO, obtenerMedicoPorId } from '@/utils/medicosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

/**
 * Ruta `/dashboard/recordatorios` — "Recordatorios de Citas" (reemplaza el
 * marcador provisional gris "Pendiente de implementar").
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets la
 * fila del médico en sesión dentro de "Medicos" y toma su
 * `configuracion_recordatorios` (columna P opcional — ver
 * `medicosRepository.ts`; N/O están reservadas para las credenciales de
 * login y nunca se tocan). Si la columna no existe o el médico no tiene fila
 * todavía, se usa `CONFIGURACION_RECORDATORIOS_POR_DEFECTO` (los 3
 * interruptores encendidos) en vez de bloquear la pantalla.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché de las preferencias de recordatorios del médico.
 */
export const dynamic = 'force-dynamic';

export default async function RecordatoriosPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const medico = await obtenerMedicoPorId(idMedico).catch((error) => {
    console.error('[RecordatoriosPage] No se pudo leer la pestaña "Medicos" de Google Sheets:', error);
    return null;
  });

  const configuracionInicial = medico?.configuracion_recordatorios ?? CONFIGURACION_RECORDATORIOS_POR_DEFECTO;

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Recordatorios de Citas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Elige con qué anticipación quieres que el sistema envíe recordatorios automáticos a tus pacientes.
        </p>
      </div>

      {medico ? (
        <MesaControlRecordatorios configuracionInicial={configuracionInicial} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <BellOff className="h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No se encontró tu perfil en la pestaña &quot;Medicos&quot;.
          </p>
          <p className="max-w-sm text-xs text-slate-400">
            Completa tu perfil de médico antes de configurar los recordatorios automáticos.
          </p>
        </div>
      )}
    </main>
  );
}
