import { redirect } from 'next/navigation';
import { OdontogramaModule } from '@/components/odontograma/OdontogramaModule';
import { PACIENTES_DEMO } from '@/components/odontograma/tipos';
import type { PacienteOdontograma } from '@/components/odontograma/tipos';
import { calcularEdad, sugerirDenticionPorEdad } from '@/utils/edad';
import { obtenerUltimoOdontogramaPorPaciente } from '@/utils/odontogramaRepository';
import { obtenerPacientePorId } from '@/utils/pacientesRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

/**
 * Ruta `/dashboard/odontograma` — Módulo de Odontograma IA e Historial Clínico.
 *
 * Server component asíncrono: en cada carga lee en vivo de Google Sheets
 * (pestaña "Odontogramas") el último snapshot guardado del paciente con el
 * que abre el módulo, y lo inyecta como estado inicial del mapa dental
 * interactivo (`<OdontogramaModule />`) — así el dentista ve de inmediato el
 * historial clínico real, sin depender de un `fetch` desde el cliente para
 * la primera pintura de la página.
 *
 * PACIENTE REAL vía `?paciente=<id_paciente>`: el formulario "Captura de
 * Pacientes Nuevos" (`/dashboard/pacientes/nuevo`) redirige aquí con ese
 * query param al registrar a alguien. Si viene y corresponde a un paciente
 * real (pestaña "Pacientes"), se usa como paciente inicial — la dentición
 * sugerida se calcula a partir de su fecha de nacimiento
 * (`sugerirDenticionPorEdad`). Si no viene, o el id no existe, se cae al
 * primer paciente de la lista de demostración (`PACIENTES_DEMO`), igual que
 * antes de este paso.
 *
 * La protección de sesión y el `<PanelShell />` (sidebar + layout
 * responsivo) ya los provee `dashboard/layout.tsx`; el `redirect` de abajo
 * es defensa en profundidad (no debería ejecutarse nunca en producción),
 * igual que en `dashboard/page.tsx`.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché del historial dental de un paciente.
 */
export const dynamic = 'force-dynamic';

interface OdontogramaPageProps {
  searchParams: { paciente?: string };
}

export default async function OdontogramaPage({ searchParams }: OdontogramaPageProps) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const idPacienteReal = searchParams.paciente?.trim();
  let pacienteInicial: PacienteOdontograma = PACIENTES_DEMO[0];

  if (idPacienteReal) {
    const pacienteReal = await obtenerPacientePorId(idPacienteReal).catch((error) => {
      console.error('[OdontogramaPage] No se pudo cargar el paciente real desde Google Sheets:', error);
      return null;
    });

    if (pacienteReal) {
      const edad = calcularEdad(pacienteReal.fecha_nacimiento);
      pacienteInicial = {
        id: pacienteReal.id_paciente,
        nombre: pacienteReal.nombre_completo,
        edad: edad ?? 0,
        denticionSugerida: sugerirDenticionPorEdad(edad),
      };
    } else {
      console.warn(
        `[OdontogramaPage] ?paciente=${idPacienteReal} no corresponde a ningún paciente real registrado — ` +
          'se usa el paciente de demostración por defecto.',
      );
    }
  }

  const registroInicial = await obtenerUltimoOdontogramaPorPaciente(pacienteInicial.id).catch((error) => {
    console.error('[OdontogramaPage] No se pudo cargar el historial dental inicial desde Google Sheets:', error);
    return null;
  });

  return <OdontogramaModule pacienteInicial={pacienteInicial} estadoInicial={registroInicial?.estado ?? null} />;
}
