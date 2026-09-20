import { CitasTable } from '@/components/CitasTable';
import { ResumenAgendaCards } from '@/components/ResumenAgendaCards';
import type { Cita } from '@/types';
import { calcularResumenAgenda } from '@/utils/agenda';
import { listarCitasPorMedico } from '@/utils/citasRepository';
import { obtenerMedicoPorId } from '@/utils/medicosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

/**
 * Cerebro administrativo del médico — `/dashboard`.
 *
 * Server component asíncrono: en cada carga (o refresh manual) lee en vivo
 * las pestañas "Medicos" y "Citas" de Google Sheets para el médico en turno,
 * calcula los 3 KPIs ejecutivos y los inyecta junto con `citasIniciales` en
 * <CitasTable /> para la gestión en tiempo real (confirmar/cancelar).
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en caché
 * de este panel — cada entrada del médico (o el botón "Sincronizar" del
 * futuro) debe recalcular los KPIs con el dato más fresco de la hoja.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // El médico "m1" es, por ahora, el único id resuelto por `session.ts`
  // (cookie `id_medico_sesion` o variable de entorno `DEMO_ID_MEDICO=m1` en
  // Vercel/.env.local) mientras no exista login real — ver el TODO en
  // `src/app/(dashboard)/dashboard/layout.tsx`. Se usa ese helper en vez de
  // escribir el literal "m1" aquí para que el día que haya autenticación,
  // este archivo no necesite ningún cambio.
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    return (
      <main className="p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-800">Agenda Médica</h1>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            No hay una sesión de médico activa. Configura la variable de entorno{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">DEMO_ID_MEDICO=m1</code> (o la cookie{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">id_medico_sesion</code>) para ver el panel de este médico.
          </p>
        </div>
      </main>
    );
  }

  // Lectura en vivo de Google Sheets — sin caché entre despliegues gracias a
  // `dynamic = 'force-dynamic'` de arriba. `listarCitasPorMedico` ya filtra
  // de forma segura del lado del servidor por `id_medico` (nunca se manda al
  // cliente la hoja completa de citas de todos los médicos).
  const [medico, citas] = await Promise.all([
    obtenerMedicoPorId(idMedico).catch((error) => {
      console.error('[DashboardPage] No se pudo obtener el médico:', error);
      return null;
    }),
    listarCitasPorMedico(idMedico).catch((error) => {
      console.error('[DashboardPage] No se pudo obtener las citas:', error);
      return [] as Cita[];
    }),
  ]);

  // "Ingresos Estimados" = citas Confirmada del mes × tarifa de consulta del
  // médico (medico.precio_consulta, leída de la columna correspondiente en
  // la pestaña "Medicos" — $850 en el caso de m1).
  const resumen = calcularResumenAgenda(citas, medico?.precio_consulta ?? 0);

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Agenda Médica</h1>
        {medico?.nombre && <p className="text-sm text-slate-500">Citas de {medico.nombre}</p>}
      </div>

      {/* MÓDULO 1 — KPIs financieros y operativos */}
      <ResumenAgendaCards
        totalCitasMes={resumen.totalCitasMes}
        citasPendientes={resumen.citasPendientes}
        ingresosEstimadosMes={resumen.ingresosEstimadosMes}
      />

      {/* MÓDULO 2 — Tabla de gestión en tiempo real */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Agenda de Citas Recientes</h2>
        <CitasTable citasIniciales={citas} />
      </section>
    </main>
  );
}
