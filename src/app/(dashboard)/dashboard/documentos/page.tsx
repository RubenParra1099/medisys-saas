import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { BuscadorPacienteFinanciero } from '@/components/documentos/BuscadorPacienteFinanciero';
import { KpisFinancieros } from '@/components/documentos/KpisFinancieros';
import { TablaMovimientos } from '@/components/documentos/TablaMovimientos';
import { calcularResumenFinanciero } from '@/components/documentos/tipos';
import { obtenerPacientePorId, listarPacientesPorMedico } from '@/utils/pacientesRepository';
import { listarMovimientosPorPaciente } from '@/utils/saldosRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { MovimientoFinanciero, Paciente } from '@/types';

/**
 * Ruta `/dashboard/documentos` — Cotizador de Presupuestos y Control de
 * Abonos (reemplaza el marcador provisional gris "Documentos & Saldos").
 *
 * NOTA DE PRECISIÓN: el enunciado de este módulo mencionaba la ruta
 * `src/app/(dashboard)/dashboard/pacientes/[id]/saldos/page.tsx`, pero esa
 * ruta no existe en el proyecto — el ítem real del `<Sidebar />` ("Documentos
 * & Saldos") apunta a `/dashboard/documentos`, que es el stub gris que sí
 * existía y el que se reemplaza aquí. Se documenta también en README.md.
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets
 * (pestaña "Saldos") el historial financiero completo del paciente activo y
 * RECALCULA los 3 KPIs desde cero — nunca se guarda un saldo acumulado en la
 * hoja, para evitar que se desincronice con el historial real de movimientos.
 *
 * PACIENTE ACTIVO vía `?id=<id_paciente>`: igual que en `/dashboard/odontograma`,
 * el botón "Cotizador" de la tabla de pacientes (`TablaPacientes.tsx`) y el
 * buscador de este mismo módulo (`BuscadorPacienteFinanciero.tsx`) navegan
 * aquí con ese query param. A diferencia del odontograma, este módulo NUNCA
 * cae a un paciente de demostración — es dinero real, así que sin `?id=` (o
 * si no corresponde a un paciente real) se muestra un estado vacío invitando
 * a elegir un paciente del buscador.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché de los saldos financieros de un paciente.
 */
export const dynamic = 'force-dynamic';

interface DocumentosPageProps {
  searchParams: { id?: string };
}

export default async function DocumentosSaldosPage({ searchParams }: DocumentosPageProps) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const pacientes = await listarPacientesPorMedico(idMedico).catch((error) => {
    console.error('[DocumentosSaldosPage] No se pudo leer la pestaña "Pacientes" de Google Sheets:', error);
    return [] as Paciente[];
  });

  const idPacienteActivo = searchParams.id?.trim();
  let pacienteActivo: Paciente | null = null;

  if (idPacienteActivo) {
    pacienteActivo = await obtenerPacientePorId(idPacienteActivo).catch((error) => {
      console.error('[DocumentosSaldosPage] No se pudo cargar el paciente desde Google Sheets:', error);
      return null;
    });
  }

  let movimientos: MovimientoFinanciero[] = [];
  if (pacienteActivo) {
    movimientos = await listarMovimientosPorPaciente(pacienteActivo.id_paciente).catch((error) => {
      console.error('[DocumentosSaldosPage] No se pudo leer la pestaña "Saldos" de Google Sheets:', error);
      return [] as MovimientoFinanciero[];
    });
  }

  const resumen = calcularResumenFinanciero(movimientos);

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Cotizador de Presupuestos y Control de Abonos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra tratamientos presupuestados y abonos, y consulta el saldo pendiente de cada paciente en tiempo real.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <BuscadorPacienteFinanciero pacientes={pacientes} idPacienteActivo={pacienteActivo?.id_paciente} />

        <div className="min-w-0 flex-1 space-y-6">
          {pacienteActivo ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{pacienteActivo.nombre_completo}</p>
                <p className="font-mono text-xs text-slate-400">{pacienteActivo.id_paciente}</p>
              </div>

              <KpisFinancieros resumen={resumen} />

              <TablaMovimientos idPaciente={pacienteActivo.id_paciente} movimientos={movimientos} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                {pacientes.length === 0
                  ? 'Todavía no hay pacientes registrados.'
                  : 'Elige un paciente del buscador para ver su cotizador.'}
              </p>
              <p className="max-w-sm text-xs text-slate-400">
                {pacientes.length === 0
                  ? 'Registra al primer paciente para poder crear cotizaciones y controlar sus abonos.'
                  : 'Verás sus 3 indicadores financieros y el historial completo de movimientos.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
