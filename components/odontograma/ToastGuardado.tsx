'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export type TipoToast = 'exito' | 'error';

interface ToastGuardadoProps {
  tipo: TipoToast;
  mensaje: string;
  onCerrar: () => void;
}

/**
 * Alerta flotante ("Toast") que confirma el resultado de "Guardar
 * Evolución" — se monta/desmonta desde `OdontogramaModule.tsx`, que además
 * la retira automáticamente después de unos segundos (`AUTO_CIERRE_MS`
 * exportado abajo para que ambos archivos usen el mismo valor).
 */
export const AUTO_CIERRE_TOAST_MS = 4000;

export function ToastGuardado({ tipo, mensaje, onCerrar }: ToastGuardadoProps) {
  const esExito = tipo === 'exito';

  // Pequeña transición de entrada (fade + slide) sin depender de ningún
  // plugin de animación de Tailwind — solo utilidades base.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const marco = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(marco);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-6 right-6 z-[60] flex w-[calc(100%-3rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        esExito ? 'border-emerald-100' : 'border-red-100',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          esExito ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
        ].join(' ')}
        aria-hidden="true"
      >
        {esExito ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </span>

      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold text-slate-800">
          {esExito ? 'Evolución guardada' : 'No se pudo guardar'}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{mensaje}</p>
      </div>

      <button
        type="button"
        onClick={onCerrar}
        className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
