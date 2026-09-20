import { redirect } from 'next/navigation';
import { FormularioNuevoPaciente } from '@/components/pacientes/FormularioNuevoPaciente';
import { obtenerIdMedicoSesion } from '@/utils/session';

/**
 * Ruta `/dashboard/pacientes/nuevo` — "Captura de Pacientes Nuevos".
 *
 * Server component mínimo, mismo patrón que `dashboard/odontograma/page.tsx`:
 * la protección de sesión y el `<PanelShell />` ya los provee
 * `dashboard/layout.tsx`; el `redirect` de abajo es defensa en profundidad
 * (no debería ejecutarse nunca en producción). Esta página solo monta el
 * formulario de cliente `<FormularioNuevoPaciente />`, que maneja todo el
 * estado del formulario y el `POST /api/pacientes/crear`.
 */
export const dynamic = 'force-dynamic';

export default function NuevoPacientePage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800">Captura de Pacientes Nuevos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra los datos del paciente para comenzar su historial clínico y odontograma.
          </p>
        </div>

        <FormularioNuevoPaciente />
      </div>
    </main>
  );
}
