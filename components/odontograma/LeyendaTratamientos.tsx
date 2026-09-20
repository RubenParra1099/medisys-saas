'use client';

import { TRATAMIENTOS } from '@/components/odontograma/tipos';
import type { TratamientoId } from '@/components/odontograma/tipos';
import { Sparkles } from 'lucide-react';

interface LeyendaTratamientosProps {
  tratamientoActivo: TratamientoId | null;
  onSeleccionar: (tratamiento: TratamientoId) => void;
}

/**
 * Panel lateral "Leyenda de Tratamientos" — además de documentar el código
 * de colores, cada botón es interactivo: al seleccionar uno se marca como
 * "tratamiento activo" (atajo de flujo clínico) y el próximo clic sobre una
 * superficie del odontograma pre-selecciona ese tratamiento dentro del
 * popover, sin tener que volver a elegirlo ahí.
 */
export function LeyendaTratamientos({ tratamientoActivo, onSeleccionar }: LeyendaTratamientosProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-800">Leyenda de Tratamientos</h2>
      </div>

      <ul className="space-y-2">
        {TRATAMIENTOS.map((tratamiento) => {
          const seleccionado = tratamientoActivo === tratamiento.id;

          return (
            <li key={tratamiento.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(tratamiento.id)}
                aria-pressed={seleccionado}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
                  seleccionado
                    ? `${tratamiento.colorBorde} ${tratamiento.colorFondoSuave} ${tratamiento.colorTexto}`
                    : 'border-slate-100 text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${tratamiento.colorFondoSolido}`} aria-hidden="true" />
                <span className={tratamiento.id === 'ausente' ? 'flex-1 line-through' : 'flex-1'}>
                  {tratamiento.etiqueta}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-400">
        Selecciona un tratamiento y luego haz clic en cualquier superficie de una pieza dental para
        aplicarlo. También puedes hacer clic directamente en una superficie y elegir el tratamiento
        desde el panel emergente.
      </p>
    </div>
  );
}
