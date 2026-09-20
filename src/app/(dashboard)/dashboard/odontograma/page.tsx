import { redirect } from 'next/navigation';
import { OdontogramaModule } from '@/components/odontograma/OdontogramaModule';
import { PACIENTES_DEMO } from '@/components/odontograma/tipos';
import { obtenerUltimoOdontogramaPorPaciente } from '@/utils/odontogramaRepository';
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
 * La protección de sesión y el `<PanelShell />` (sidebar + layout
 * responsivo) ya los provee `dashboard/layout.tsx`; el `redirect` de abajo
 * es defensa en profundidad (no debería ejecutarse nunca en producción),
 * igual que en `dashboard/page.tsx`.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché del historial dental de un paciente.
 */
export const dynamic = 'force-dynamic';

export default async function OdontogramaPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  // El módulo abre siempre con el primer paciente de la lista de
  // demostración (`PACIENTES_DEMO`) — al cambiar de paciente desde el
  // buscador, `OdontogramaModule.tsx` trae el historial de ESE paciente por
  // su cuenta vía `GET /api/odontograma/:idPaciente` (no hay navegación de
  // página en ese cambio, así que no puede resolverse aquí).
  const pacienteInicial = PACIENTES_DEMO[0];

  const registroInicial = await obtenerUltimoOdontogramaPorPaciente(pacienteInicial.id).catch((error) => {
    console.error('[OdontogramaPage] No se pudo cargar el historial dental inicial desde Google Sheets:', error);
    return null;
  });

  return <OdontogramaModule pacienteInicial={pacienteInicial} estadoInicial={registroInicial?.estado ?? null} />;
}
