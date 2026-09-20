import { redirect } from 'next/navigation';
import { Calculator } from 'lucide-react';
import { BuscadorPacienteClinico } from '@/components/pacientes/BuscadorPacienteClinico';
import { PanelCotizador } from '@/components/cotizador/PanelCotizador';
import { obtenerPacientePorId, listarPacientesPorMedico } from '@/utils/pacientesRepository';
import { listarPresupuestosPorPaciente } from '@/utils/presupuestosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { Paciente, PresupuestoDetallado } from '@/types';

/**
 * Ruta `/dashboard/cotizador` — Cotizador de Presupuestos (reemplaza el
 * marcador provisional gris "Pendiente de implementar").
 *
 * NOTA DE PRECISIÓN: el enunciado de este módulo mencionaba la ruta anidada
 * `src/app/(dashboard)/dashboard/pacientes/[id]/cotizador/page.tsx`, pero esa
 * ruta no existe en el proyecto — el ítem real del `<Sidebar />` ("Cotizador
 * Presupuestos") apunta a `/dashboard/cotizador`, que es el stub gris que sí
 * existía y el que se reemplaza aquí. Se documenta también en README.md.
 *
 * NO CONFUNDIR con `/dashboard/documentos` ("Documentos & Saldos"): ese
 * módulo es el LEDGER de movimientos financieros ya generados (cargos y
 * abonos). Este módulo (`/dashboard/cotizador`) es el GENERADOR de
 * presupuestos formales por tratamiento — su botón "Pasar a Estado de
 * Cuenta" es el puente explícito entre ambos: envía el total del presupuesto
 * como un nuevo cargo tipo `'Presupuesto'` a la pestaña "Saldos".
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets
 * (pestaña "Presupuestos_Detallados") los presupuestos del paciente activo.
 *
 * PACIENTE ACTIVO vía `?id=<id_paciente>`: mismo patrón exacto que
 * `/dashboard/documentos`/`/dashboard/historial`.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en caché
 * de los presupuestos de un paciente.
 */
export const dynamic = 'force-dynamic';

interface CotizadorPageProps {
  searchParams: { id?: string };
}

export default async function CotizadorPage({ searchParams }: CotizadorPageProps) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const pacientes = await listarPacientesPorMedico(idMedico).catch((error) => {
    console.error('[CotizadorPage] No se pudo leer la pestaña "Pacientes" de Google Sheets:', error);
    return [] as Paciente[];
  });

  const idPacienteActivo = searchParams.id?.trim();
  let pacienteActivo: Paciente | null = null;

  if (idPacienteActivo) {
    pacienteActivo = await obtenerPacientePorId(idPacienteActivo).catch((error) => {
      console.error('[CotizadorPage] No se pudo cargar el paciente desde Google Sheets:', error);
      return null;
    });
  }

  let presupuestos: PresupuestoDetallado[] = [];
  if (pacienteActivo) {
    presupuestos = await listarPresupuestosPorPaciente(pacienteActivo.id_paciente).catch((error) => {
      console.error('[CotizadorPage] No se pudo leer la pestaña "Presupuestos_Detallados" de Google Sheets:', error);
      return [] as PresupuestoDetallado[];
    });
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Cotizador de Presupuestos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Arma presupuestos formales por tratamiento y envíalos a Documentos &amp; Saldos cuando el paciente los acepte.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <BuscadorPacienteClinico
          pacientes={pacientes}
          idPacienteActivo={pacienteActivo?.id_paciente}
          baseHref="/dashboard/cotizador"
        />

        <div className="min-w-0 flex-1 space-y-6">
          {pacienteActivo ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{pacienteActivo.nombre_completo}</p>
                <p className="font-mono text-xs text-slate-400">{pacienteActivo.id_paciente}</p>
              </div>

              <PanelCotizador idPaciente={pacienteActivo.id_paciente} presupuestosIniciales={presupuestos} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Calculator className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                {pacientes.length === 0
                  ? 'Todavía no hay pacientes registrados.'
                  : 'Elige un paciente del buscador para armar su presupuesto.'}
              </p>
              <p className="max-w-sm text-xs text-slate-400">
                {pacientes.length === 0
                  ? 'Registra al primer paciente para poder crear presupuestos de tratamientos.'
                  : 'Podrás agregar tratamientos, calcular el total y enviarlo a Documentos & Saldos.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
