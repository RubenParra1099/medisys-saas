import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/PanelShell';
import { listarCitasPorMedico } from '@/utils/citasRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';

/**
 * Guard de sesión para TODO el árbol `/dashboard/*` (no solo la página raíz):
 * sin una cookie `id_medico_sesion` con firma válida, se redirige a `/login`
 * antes de renderizar cualquier hijo. Esto reemplaza por completo al
 * placeholder `DEMO_ID_MEDICO`.
 *
 * TODO: además de la sesión, verificar aquí `estatus_pago === 'activo'` del
 * médico antes de dejarlo entrar (suscripción vencida → pantalla de cobro).
 *
 * Nota de diseño: se implementa en este layout (Server Component, runtime
 * Node.js) y no en `middleware.ts` porque la verificación de firma usa el
 * módulo `crypto` de Node (`createHmac`/`timingSafeEqual`), que no está
 * disponible en el Edge Runtime donde corre el middleware por defecto. Para
 * mover esta verificación a middleware más adelante habría que reescribirla
 * con la Web Crypto API (`crypto.subtle`) — posible, pero no es necesario
 * mientras el guard aquí ya bloquea el acceso antes de tocar Google Sheets.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  let contadorAgendaHoy = 0;
  try {
    // `listarCitasPorMedico` está envuelta en `cache()`: si la página hija
    // (p. ej. /dashboard) también la llama con el mismo idMedico en esta
    // misma petición, no se vuelve a golpear Google Sheets.
    const citas = await listarCitasPorMedico(idMedico);
    contadorAgendaHoy = citas.filter((cita) => cita.estatus === 'Pendiente').length;
  } catch (error) {
    console.error('[DashboardLayout] No se pudo calcular el contador de pendientes:', error);
  }

  return (
    <PanelShell idMedico={idMedico} contadorAgendaHoy={contadorAgendaHoy}>
      {children}
    </PanelShell>
  );
}
