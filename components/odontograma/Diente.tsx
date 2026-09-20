'use client';

import { obtenerDefinicionTratamiento } from '@/components/odontograma/tipos';
import type { EstadoSuperficies, Superficie } from '@/components/odontograma/tipos';

interface DienteProps {
  numero: number;
  estado: EstadoSuperficies;
  /** Pieza destacada por búsqueda/selección — resalta el número y el marco. */
  activo?: boolean;
  onClickSuperficie: (numero: number, superficie: Superficie) => void;
}

/**
 * Diagrama SVG "de sobre" de una pieza dental con sus 5 superficies clínicas
 * clicables de forma independiente, sobre un lienzo `viewBox="0 0 100 100"`:
 *
 *        ┌─────────────────┐
 *        │   \ VESTIBULAR /│
 *        │ M  \─────────/ D│   M = Mesial, D = Distal (lados)
 *        │ E  │ OCLUSAL │ I│
 *        │ S  │ (centro)│ S│
 *        │ I  /─────────\ T│
 *        │ A  / LINGUAL  \A│
 *        └─────────────────┘
 *
 * Cada superficie es un polígono independiente; su color de relleno/borde
 * refleja el tratamiento aplicado (vía `obtenerDefinicionTratamiento`). El
 * estado "ausente" dibuja además una X diagonal completa sobre la pieza.
 */
export function Diente({ numero, estado, activo = false, onClickSuperficie }: DienteProps) {
  const ausente = SUPERFICIES_CON_ESTADO(estado).some(([, tratamiento]) => tratamiento === 'ausente');

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={[
          'text-[11px] font-semibold tabular-nums',
          activo ? 'text-primary' : 'text-slate-500',
        ].join(' ')}
      >
        {numero}
      </span>

      <svg
        viewBox="0 0 100 100"
        className={[
          'h-14 w-14 overflow-visible rounded-md sm:h-16 sm:w-16',
          activo ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-50' : '',
        ].join(' ')}
        role="group"
        aria-label={`Pieza dental ${numero}`}
      >
        {/* Contorno general de la pieza, puramente decorativo */}
        <rect x="2" y="2" width="96" height="96" rx="10" className="fill-white stroke-slate-200" strokeWidth="1.5" />

        <Superficie
          numero={numero}
          superficie="vestibular"
          tratamiento={estado.vestibular}
          puntos="6,6 94,6 66,32 34,32"
          onClick={onClickSuperficie}
        />
        <Superficie
          numero={numero}
          superficie="distal"
          tratamiento={estado.distal}
          puntos="94,6 66,32 66,68 94,94"
          onClick={onClickSuperficie}
        />
        <Superficie
          numero={numero}
          superficie="lingual"
          tratamiento={estado.lingual}
          puntos="6,94 94,94 66,68 34,68"
          onClick={onClickSuperficie}
        />
        <Superficie
          numero={numero}
          superficie="mesial"
          tratamiento={estado.mesial}
          puntos="6,6 34,32 34,68 6,94"
          onClick={onClickSuperficie}
        />
        <SuperficieOclusal
          numero={numero}
          tratamiento={estado.oclusal}
          onClick={onClickSuperficie}
        />

        {ausente && (
          <>
            <line x1="6" y1="6" x2="94" y2="94" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <line x1="94" y1="6" x2="6" y2="94" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

/** Helper de iteración tipada — evita `Object.entries` sin tipos en el componente. */
function SUPERFICIES_CON_ESTADO(estado: EstadoSuperficies): Array<[Superficie, EstadoSuperficies[Superficie]]> {
  return [
    ['vestibular', estado.vestibular],
    ['lingual', estado.lingual],
    ['mesial', estado.mesial],
    ['distal', estado.distal],
    ['oclusal', estado.oclusal],
  ];
}

interface SuperficieProps {
  numero: number;
  superficie: Superficie;
  tratamiento: EstadoSuperficies[Superficie];
  puntos: string;
  onClick: (numero: number, superficie: Superficie) => void;
}

/** Una de las 4 superficies perimetrales (vestibular / lingual / mesial / distal). */
function Superficie({ numero, superficie, tratamiento, puntos, onClick }: SuperficieProps) {
  const definicion = obtenerDefinicionTratamiento(tratamiento);

  return (
    <polygon
      points={puntos}
      fill={definicion.fillSvg}
      stroke={definicion.strokeSvg}
      strokeWidth={tratamiento === 'sano' ? 1 : 1.75}
      className="cursor-pointer transition-opacity hover:opacity-80"
      onClick={() => onClick(numero, superficie)}
    >
      <title>
        Pieza {numero} · {superficie} · {definicion.etiqueta}
      </title>
    </polygon>
  );
}

interface SuperficieOclusalProps {
  numero: number;
  tratamiento: EstadoSuperficies['oclusal'];
  onClick: (numero: number, superficie: Superficie) => void;
}

/** La superficie oclusal es el cuadro central — se dibuja aparte por ser un rect, no un polygon. */
function SuperficieOclusal({ numero, tratamiento, onClick }: SuperficieOclusalProps) {
  const definicion = obtenerDefinicionTratamiento(tratamiento);

  return (
    <rect
      x="34"
      y="34"
      width="32"
      height="32"
      fill={definicion.fillSvg}
      stroke={definicion.strokeSvg}
      strokeWidth={tratamiento === 'sano' ? 1 : 1.75}
      className="cursor-pointer transition-opacity hover:opacity-80"
      onClick={() => onClick(numero, 'oclusal')}
    >
      <title>
        Pieza {numero} · oclusal · {definicion.etiqueta}
      </title>
    </rect>
  );
}
