'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export type TipoToast = 'exito' | 'error';

interface ToastFlotanteProps {
  tipo: TipoToast;
  titulo: string;
  mensaje: string;
  onCerrar: () => void;
}

/** Ambos módulos que la usan la retiran automáticamente tras este tiempo. */
export const AUTO_CIERRE_TOAST_FLOTANTE_MS = 4000;

/**
 * Alerta flotante genérica de éxito/error — misma apariencia que
 * `odontograma/ToastGuardado.tsx`, pero con título/mensaje configurables en
 * vez del texto fijo "Evolución guardada" (que es específico del módulo de
 * Odontograma). Se deja `ToastGuardado.tsx` intacto para no arriesgar ese
 * flujo ya probado, y este componente compartido en `components/ui/` se usa
 * para los módulos nuevos ("Mi Consultorio", "Correos Autorizados",
 * "Recordatorios de Citas") que necesitan textos distintos cada uno.
 */
export function ToastFlotante({ tipo, titulo, mensaje, onCerrar }: ToastFlotanteProps) {
  const esExito = tipo === 'exito';

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
        <p className="text-sm font-semibold text-slate-800">{titulo}</p>
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
