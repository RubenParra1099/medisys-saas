import { PanelShell } from '@/components/PanelShell';
import { listarCitasPorMedico } from '@/utils/citasRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

// TODO: agregar guard de sesión + verificación de estatus_pago === 'activo'
// antes de renderizar cualquier página del panel del médico.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const idMedico = obtenerIdMedicoSesion();

  let contadorAgendaHoy = 0;
  if (idMedico) {
    try {
      // `listarCitasPorMedico` está envuelta en `cache()`: si la página hija
      // (p. ej. Agenda) también la llama con el mismo idMedico en esta misma
      // petición, no se vuelve a golpear Google Sheets.
      const citas = await listarCitasPorMedico(idMedico);
      contadorAgendaHoy = citas.filter((cita) => cita.estatus === 'Pendiente').length;
    } catch (error) {
      console.error('[PanelLayout] No se pudo calcular el contador de pendientes:', error);
    }
  }

  return (
    <PanelShell idMedico={idMedico ?? undefined} contadorAgendaHoy={contadorAgendaHoy}>
      {children}
    </PanelShell>
  );
}
