'use client';

import { ClipboardList } from 'lucide-react';
import {
  ETIQUETAS_SUPERFICIE,
  obtenerDefinicionTratamiento,
} from '@/components/odontograma/tipos';
import type { HallazgoHistorial } from '@/components/odontograma/tipos';

interface HistorialEvolucionProps {
  hallazgos: HallazgoHistorial[];
}

/**
 * Lista textual de "Historial de Evolución" — describe en lenguaje clínico
 * cada hallazgo registrado durante la sesión actual (más reciente primero).
 * Es puramente derivada del estado en memoria de `OdontogramaModule`: no
 * persiste entre recargas de página, por ser datos de prueba.
 */
export function HistorialEvolucion({ hallazgos }: HistorialEvolucionProps) {
  const hallazgosOrdenados = [...hallazgos].reverse();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-800">Historial de Evolución (sesión actual)</h2>
      </div>

      {hallazgosOrdenados.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          Aún no se han registrado hallazgos. Haz clic en una superficie del odontograma para
          comenzar.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {hallazgosOrdenados.map((hallazgo) => {
            const definicion = obtenerDefinicionTratamiento(hallazgo.tratamiento);

            return (
              <li
                key={hallazgo.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${definicion.colorFondoSolido}`}
                  aria-hidden="true"
                />
                <div className="flex-1 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Pieza {hallazgo.numeroDiente}:</span>{' '}
                  <span className={definicion.colorTexto}>{definicion.etiqueta}</span>{' '}
                  {hallazgo.tratamiento === 'ausente' ? (
                    <span>(toda la pieza)</span>
                  ) : (
                    <>
                      en superficie <span className="font-medium">{ETIQUETAS_SUPERFICIE[hallazgo.superficie]}</span>
                    </>
                  )}
                  .
                </div>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{hallazgo.hora}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
