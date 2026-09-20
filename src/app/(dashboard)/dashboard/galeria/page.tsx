import { redirect } from 'next/navigation';
import { Image as ImageIcon } from 'lucide-react';
import { BuscadorPacienteClinico } from '@/components/pacientes/BuscadorPacienteClinico';
import { GridGaleria } from '@/components/galeria/GridGaleria';
import { obtenerPacientePorId, listarPacientesPorMedico } from '@/utils/pacientesRepository';
import { listarFotosPorPaciente } from '@/utils/galeriaRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { FotoGaleria, Paciente } from '@/types';

/**
 * Ruta `/dashboard/galeria` — Galería Clínica (reemplaza el marcador
 * provisional gris "Pendiente de implementar").
 *
 * NOTA DE PRECISIÓN: el enunciado de este módulo mencionaba la ruta anidada
 * `src/app/(dashboard)/dashboard/pacientes/[id]/galeria/page.tsx`, pero esa
 * ruta no existe en el proyecto — el ítem real del `<Sidebar />` ("Galería
 * Clínica") apunta a `/dashboard/galeria`, que es el stub gris que sí
 * existía y el que se reemplaza aquí. Se documenta también en README.md.
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets
 * (pestaña "Galeria_Clinica") las fotos/radiografías del paciente activo.
 *
 * PACIENTE ACTIVO vía `?id=<id_paciente>`: mismo patrón exacto que
 * `/dashboard/documentos`/`/dashboard/historial`/`/dashboard/cotizador`.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en caché
 * de la galería de un paciente.
 */
export const dynamic = 'force-dynamic';

interface GaleriaPageProps {
  searchParams: { id?: string };
}

export default async function GaleriaClinicaPage({ searchParams }: GaleriaPageProps) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const pacientes = await listarPacientesPorMedico(idMedico).catch((error) => {
    console.error('[GaleriaClinicaPage] No se pudo leer la pestaña "Pacientes" de Google Sheets:', error);
    return [] as Paciente[];
  });

  const idPacienteActivo = searchParams.id?.trim();
  let pacienteActivo: Paciente | null = null;

  if (idPacienteActivo) {
    pacienteActivo = await obtenerPacientePorId(idPacienteActivo).catch((error) => {
      console.error('[GaleriaClinicaPage] No se pudo cargar el paciente desde Google Sheets:', error);
      return null;
    });
  }

  let fotos: FotoGaleria[] = [];
  if (pacienteActivo) {
    fotos = await listarFotosPorPaciente(pacienteActivo.id_paciente).catch((error) => {
      console.error('[GaleriaClinicaPage] No se pudo leer la pestaña "Galeria_Clinica" de Google Sheets:', error);
      return [] as FotoGaleria[];
    });
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Galería Clínica</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organiza las radiografías y fotografías de cada paciente por fecha.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <BuscadorPacienteClinico
          pacientes={pacientes}
          idPacienteActivo={pacienteActivo?.id_paciente}
          baseHref="/dashboard/galeria"
        />

        <div className="min-w-0 flex-1 space-y-6">
          {pacienteActivo ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{pacienteActivo.nombre_completo}</p>
                <p className="font-mono text-xs text-slate-400">{pacienteActivo.id_paciente}</p>
              </div>

              <GridGaleria idPaciente={pacienteActivo.id_paciente} fotosIniciales={fotos} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <ImageIcon className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                {pacientes.length === 0
                  ? 'Todavía no hay pacientes registrados.'
                  : 'Elige un paciente del buscador para ver su galería clínica.'}
              </p>
              <p className="max-w-sm text-xs text-slate-400">
                {pacientes.length === 0
                  ? 'Registra al primer paciente para poder guardar sus radiografías y fotos.'
                  : 'Verás sus imágenes organizadas por fecha y podrás subir nuevas.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
