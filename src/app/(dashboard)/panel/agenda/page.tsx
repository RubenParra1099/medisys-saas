import { AgendaCitasTable } from '@/components/AgendaCitasTable';
import { ResumenAgendaCards } from '@/components/ResumenAgendaCards';
import type { Cita } from '@/types';
import { calcularResumenAgenda } from '@/utils/agenda';
import { listarCitasPorMedico } from '@/utils/citasRepository';
import { obtenerMedicoPorId } from '@/utils/medicosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

export const dynamic = 'force-dynamic';

/** Agenda Médica — server component: KPIs + tabla de citas del médico logueado. */
export default async function AgendaPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    return (
      <main className="p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-800">Agenda Médica</h1>
        <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            No hay una sesión de médico activa. Mientras se implementa la autenticación real,
            configura la variable de entorno <code className="rounded bg-slate-100 px-1.5 py-0.5">DEMO_ID_MEDICO</code>{' '}
            (o la cookie <code className="rounded bg-slate-100 px-1.5 py-0.5">id_medico_sesion</code>) con el
            <code className="rounded bg-slate-100 px-1.5 py-0.5">id_medico</code> a mostrar.
          </p>
        </div>
      </main>
    );
  }

  const [medico, citas] = await Promise.all([
    obtenerMedicoPorId(idMedico).catch((error) => {
      console.error('[AgendaPage] No se pudo obtener el médico:', error);
      return null;
    }),
    listarCitasPorMedico(idMedico).catch((error) => {
      console.error('[AgendaPage] No se pudo obtener las citas:', error);
      return [] as Cita[];
    }),
  ]);

  const resumen = calcularResumenAgenda(citas, medico?.precio_consulta ?? 0);

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Agenda Médica</h1>
        {medico?.nombre && <p className="text-sm text-slate-500">Citas de {medico.nombre}</p>}
      </div>

      <ResumenAgendaCards
        totalCitasMes={resumen.totalCitasMes}
        citasPendientes={resumen.citasPendientes}
        ingresosEstimadosMes={resumen.ingresosEstimadosMes}
      />

      <AgendaCitasTable citasIniciales={citas} />
    </main>
  );
}
