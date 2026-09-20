import { OdontogramaModule } from '@/components/odontograma/OdontogramaModule';

/**
 * Ruta `/dashboard/odontograma` — Módulo de Odontograma IA e Historial Clínico.
 *
 * Se mantiene como server component mínimo a propósito: la protección de
 * sesión y el `<PanelShell />` (sidebar + layout responsivo) ya los provee
 * `dashboard/layout.tsx`, así que esta página solo monta el orquestador de
 * cliente `<OdontogramaModule />`, que es quien maneja todo el estado
 * interactivo (paciente activo, dentición, superficies, popover, historial).
 *
 * Todo el contenido de este módulo es DATA DE PRUEBA en memoria (useState) —
 * no hay lectura ni escritura a Google Sheets desde aquí, por instrucción
 * explícita del alcance de este paso.
 */
export default function OdontogramaPage() {
  return <OdontogramaModule />;
}
