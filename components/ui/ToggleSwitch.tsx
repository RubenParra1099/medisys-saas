'use client';

interface ToggleSwitchProps {
  activo: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
  /** Texto para lectores de pantalla — el toggle no tiene ningún label visible propio. */
  etiquetaAccesible: string;
}

/**
 * Interruptor visual reutilizable (Tailwind puro, sin dependencias) — usado
 * por la Mesa de Control de Recordatorios (`/dashboard/recordatorios`).
 * Primer componente real de `src/components/ui/` (antes solo un directorio
 * vacío reservado para el design system — ver `ARQUITECTURA.md`).
 */
export function ToggleSwitch({ activo, onChange, disabled, etiquetaAccesible }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiquetaAccesible}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        activo ? 'bg-primary' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
          activo ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
