import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { BuscadorPacienteClinico } from '@/components/pacientes/BuscadorPacienteClinico';
import { TimelineHistorial } from '@/components/historial/TimelineHistorial';
import { obtenerPacientePorId, listarPacientesPorMedico } from '@/utils/pacientesRepository';
import { listarHistorialPorPaciente } from '@/utils/historialClinicoRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { Paciente, RegistroHistorialClinico } from '@/types';

/**
 * Ruta `/dashboard/historial` — Historial Clínico (reemplaza el marcador
 * provisional gris "Pendiente de implementar").
 *
 * NOTA DE PRECISIÓN: el enunciado de este módulo mencionaba la ruta anidada
 * `src/app/(dashboard)/dashboard/pacientes/[id]/historial/page.tsx`, pero esa
 * ruta no existe en el proyecto — el ítem real del `<Sidebar />` ("Historial
 * Clínico") apunta a `/dashboard/historial`, que es el stub gris que sí
 * existía y el que se reemplaza aquí. Se documenta también en README.md.
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets
 * (pestaña "Historiales_Clinicos") la Timeline completa del paciente activo.
 *
 * PACIENTE ACTIVO vía `?id=<id_paciente>`: mismo patrón exacto que
 * `/dashboard/documentos` — el buscador de este módulo
 * (`BuscadorPacienteClinico.tsx`) navega aquí con ese query param. Sin `?id=`
 * (o si no corresponde a un paciente real) se muestra un estado vacío
 * invitando a elegir un paciente del buscador.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en caché
 * del expediente clínico de un paciente.
 */
export const dynamic = 'force-dynamic';

interface HistorialPageProps {
  searchParams: { id?: string };
}

export default async function HistorialClinicoPage({ searchParams }: HistorialPageProps) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const pacientes = await listarPacientesPorMedico(idMedico).catch((error) => {
    console.error('[HistorialClinicoPage] No se pudo leer la pestaña "Pacientes" de Google Sheets:', error);
    return [] as Paciente[];
  });

  const idPacienteActivo = searchParams.id?.trim();
  let pacienteActivo: Paciente | null = null;

  if (idPacienteActivo) {
    pacienteActivo = await obtenerPacientePorId(idPacienteActivo).catch((error) => {
      console.error('[HistorialClinicoPage] No se pudo cargar el paciente desde Google Sheets:', error);
      return null;
    });
  }

  let registros: RegistroHistorialClinico[] = [];
  if (pacienteActivo) {
    registros = await listarHistorialPorPaciente(pacienteActivo.id_paciente).catch((error) => {
      console.error('[HistorialClinicoPage] No se pudo leer la pestaña "Historiales_Clinicos" de Google Sheets:', error);
      return [] as RegistroHistorialClinico[];
    });
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Historial Clínico</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta la línea del tiempo de cada paciente y agrega nuevas notas de evolución.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <BuscadorPacienteClinico
          pacientes={pacientes}
          idPacienteActivo={pacienteActivo?.id_paciente}
          baseHref="/dashboard/historial"
        />

        <div className="min-w-0 flex-1 space-y-6">
          {pacienteActivo ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{pacienteActivo.nombre_completo}</p>
                <p className="font-mono text-xs text-slate-400">{pacienteActivo.id_paciente}</p>
              </div>

              <TimelineHistorial idPaciente={pacienteActivo.id_paciente} registrosIniciales={registros} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                {pacientes.length === 0
                  ? 'Todavía no hay pacientes registrados.'
                  : 'Elige un paciente del buscador para ver su historial clínico.'}
              </p>
              <p className="max-w-sm text-xs text-slate-400">
                {pacientes.length === 0
                  ? 'Registra al primer paciente para poder capturar sus notas de evolución.'
                  : 'Verás su línea del tiempo completa de consultas y podrás agregar nuevas notas.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
