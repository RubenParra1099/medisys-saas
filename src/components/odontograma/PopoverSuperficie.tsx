'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  ETIQUETAS_SUPERFICIE,
  TRATAMIENTO_SANO,
  TRATAMIENTOS,
  obtenerDefinicionTratamiento,
} from '@/components/odontograma/tipos';
import type { Superficie, TratamientoId } from '@/components/odontograma/tipos';

interface SeleccionSuperficie {
  numeroDiente: number;
  superficie: Superficie;
  tratamientoActual: TratamientoId;
}

interface PopoverSuperficieProps {
  seleccion: SeleccionSuperficie;
  onAplicar: (tratamiento: TratamientoId) => void;
  onCerrar: () => void;
}

/**
 * Panel emergente ("popover") que se abre al hacer clic en una superficie
 * concreta de una pieza dental. Se implementa como overlay centrado en
 * lugar de un popover anclado con posicionamiento absoluto porque este
 * entorno no cuenta con herramientas de verificación visual en navegador
 * para calibrar coordenadas de anclaje con precisión — el overlay centrado
 * es robusto en cualquier tamaño de pantalla y no requiere esa calibración.
 */
export function PopoverSuperficie({ seleccion, onAplicar, onCerrar }: PopoverSuperficieProps) {
  // Cerrar con la tecla Escape, por accesibilidad.
  useEffect(() => {
    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [onCerrar]);

  const definicionActual =
    seleccion.tratamientoActual === 'sano'
      ? TRATAMIENTO_SANO
      : obtenerDefinicionTratamiento(seleccion.tratamientoActual);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Diagnóstico para pieza ${seleccion.numeroDiente}`}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pieza {seleccion.numeroDiente}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-800">
              {ETIQUETAS_SUPERFICIE[seleccion.superficie]}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Estado actual:{' '}
          <span className={`font-semibold ${definicionActual.colorTexto}`}>{definicionActual.etiqueta}</span>
        </p>

        <div className="mt-4 space-y-1.5">
          <button
            type="button"
            onClick={() => onAplicar('sano')}
            className={[
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
              seleccion.tratamientoActual === 'sano'
                ? 'border-slate-300 bg-slate-50 text-slate-700'
                : 'border-slate-100 text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-300 bg-white" aria-hidden="true" />
            <span className="flex-1">Marcar como sano</span>
          </button>

          {TRATAMIENTOS.map((tratamiento) => {
            const seleccionado = seleccion.tratamientoActual === tratamiento.id;

            return (
              <button
                key={tratamiento.id}
                type="button"
                onClick={() => onAplicar(tratamiento.id)}
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
            );
          })}
        </div>

        {seleccion.superficie !== 'oclusal' && (
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
            Nota: si marcas &quot;Ausente / Extracción&quot;, se aplicará a las 5 superficies de la
            pieza {seleccion.numeroDiente} (una pieza ausente no tiene superficies parciales).
          </p>
        )}
      </div>
    </div>
  );
}
