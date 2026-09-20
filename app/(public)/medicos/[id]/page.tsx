import { DoctorProfileCard } from '@/components/DoctorProfileCard';
import { HeroBanner } from '@/components/HeroBanner';
import { PatientForm } from '@/components/PatientForm';
import { PortalTopBar } from '@/components/PortalTopBar';
import { obtenerMedicoPorId } from '@/utils/medicosRepository';

function construirUrlSheet(): string | undefined {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : undefined;
}

/** Portal de reserva público — server component: obtiene al médico y compone la página. */
export default async function PerfilMedicoPage({ params }: { params: { id: string } }) {
  const medico = await obtenerMedicoPorId(params.id).catch((error) => {
    console.error(`[PerfilMedicoPage] No se pudo obtener el médico ${params.id}:`, error);
    return null;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalTopBar sheetUrl={construirUrlSheet()} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <HeroBanner nombre={medico?.nombre} especialidad={medico?.especialidad} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <DoctorProfileCard medico={medico} />

          <PatientForm
            idMedico={params.id}
            nombreMedico={medico?.nombre}
            calendario={{ horarioSemanal: medico?.horario_config }}
          />
        </div>
      </main>
    </div>
  );
}
