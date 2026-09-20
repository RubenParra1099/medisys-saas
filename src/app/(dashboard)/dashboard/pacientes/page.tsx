// TODO: Listado y ficha de pacientes (leer `listarPacientesPorMedico` de
// `pacientesRepository.ts`, ya implementado y listo para usarse aquí).
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function PacientesPage() {
  return (
    <main className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        <Link
          href="/dashboard/pacientes/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Paciente
        </Link>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          El listado de pacientes registrados está pendiente de implementar — mientras tanto, usa el
          botón &quot;Registrar Paciente&quot; para dar de alta a alguien nuevo; al terminar, se abre
          directo su odontograma.
        </p>
      </div>
    </main>
  );
}
