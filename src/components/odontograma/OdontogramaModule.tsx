'use client';

import { useMemo, useRef, useState } from 'react';
import { BuscadorPacientes } from '@/components/odontograma/BuscadorPacientes';
import { Diente } from '@/components/odontograma/Diente';
import { HistorialEvolucion } from '@/components/odontograma/HistorialEvolucion';
import { LeyendaTratamientos } from '@/components/odontograma/LeyendaTratamientos';
import { PopoverSuperficie } from '@/components/odontograma/PopoverSuperficie';
import {
  ETIQUETAS_DENTICION,
  LAYOUT_DENTICION,
  PACIENTES_DEMO,
  crearSuperficiesSanas,
} from '@/components/odontograma/tipos';
import type {
  EstadoOdontograma,
  EstadoSuperficies,
  HallazgoHistorial,
  PacienteDemo,
  Superficie,
  TipoDenticion,
  TratamientoId,
} from '@/components/odontograma/tipos';

interface SeleccionActiva {
  numeroDiente: number;
  superficie: Superficie;
}

/**
 * Orquestador principal del Módulo de Odontograma IA e Historial Clínico.
 *
 * Todo el estado clínico vive aquí, en memoria, indexado por paciente — es
 * DATA DE PRUEBA por instrucción explícita: nada se lee ni se escribe en
 * Google Sheets. Al recargar la página, el estado vuelve a su punto de
 * partida (todas las piezas "sanas").
 *
 * Estructura del estado:
 *  - `estadoPorPaciente[idPaciente][numeroDiente]` → superficies de esa pieza.
 *  - `historialPorPaciente[idPaciente]` → lista de hallazgos registrados en
 *    esta sesión, en el orden en que se aplicaron (más reciente al final;
 *    `HistorialEvolucion` se encarga de invertir el orden visualmente).
 *
 * Los números de pieza FDI de la dentición adulta (11-48) y la infantil
 * (51-85) nunca se traslapan, así que un único mapa plano por paciente
 * sirve para ambas denticiones sin necesidad de namespacing adicional.
 */
export function OdontogramaModule() {
  const [pacienteActivo, setPacienteActivo] = useState<PacienteDemo>(PACIENTES_DEMO[0]);
  const [tipoDenticion, setTipoDenticion] = useState<TipoDenticion>(PACIENTES_DEMO[0].denticionSugerida);
  const [tratamientoActivo, setTratamientoActivo] = useState<TratamientoId | null>(null);
  const [estadoPorPaciente, setEstadoPorPaciente] = useState<Record<string, EstadoOdontograma>>({});
  const [historialPorPaciente, setHistorialPorPaciente] = useState<Record<string, HallazgoHistorial[]>>({});
  const [seleccionActiva, setSeleccionActiva] = useState<SeleccionActiva | null>(null);

  // Contador simple para IDs de hallazgo únicos dentro de la sesión — evita
  // depender de `crypto.randomUUID()` (no disponible en todos los entornos
  // de renderizado) solo para una clave de lista de React.
  const contadorHallazgos = useRef(0);

  const layoutActual = LAYOUT_DENTICION[tipoDenticion];
  const estadoOdontogramaActual = estadoPorPaciente[pacienteActivo.id] ?? {};
  const historialActual = historialPorPaciente[pacienteActivo.id] ?? [];

  function obtenerEstadoDiente(numero: number): EstadoSuperficies {
    return estadoOdontogramaActual[numero] ?? crearSuperficiesSanas();
  }

  function manejarSeleccionPaciente(paciente: PacienteDemo) {
    setPacienteActivo(paciente);
    setTipoDenticion(paciente.denticionSugerida);
    setSeleccionActiva(null);
  }

  function abrirPopover(numeroDiente: number, superficie: Superficie) {
    setSeleccionActiva({ numeroDiente, superficie });
  }

  function cerrarPopover() {
    setSeleccionActiva(null);
  }

  function registrarHallazgo(numeroDiente: number, superficie: Superficie, tratamiento: TratamientoId) {
    contadorHallazgos.current += 1;
    const nuevoHallazgo: HallazgoHistorial = {
      id: `h${contadorHallazgos.current}`,
      numeroDiente,
      superficie,
      tratamiento,
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setHistorialPorPaciente((previo) => ({
      ...previo,
      [pacienteActivo.id]: [...(previo[pacienteActivo.id] ?? []), nuevoHallazgo],
    }));
  }

  /**
   * Aplica un tratamiento a UNA superficie de UNA pieza del paciente activo.
   *
   * Caso especial: "Ausente / Extracción" no tiene sentido como estado
   * parcial de una sola superficie (una pieza extraída no tiene cara
   * vestibular sana y cara lingual ausente al mismo tiempo), así que se
   * propaga a las 5 superficies de la pieza de una sola vez.
   */
  function aplicarTratamiento(numeroDiente: number, superficie: Superficie, tratamiento: TratamientoId) {
    const superficiesActuales = obtenerEstadoDiente(numeroDiente);

    let nuevasSuperficies: EstadoSuperficies;
    if (tratamiento === 'ausente') {
      nuevasSuperficies = {
        vestibular: 'ausente',
        lingual: 'ausente',
        mesial: 'ausente',
        distal: 'ausente',
        oclusal: 'ausente',
      };
    } else {
      nuevasSuperficies = { ...superficiesActuales, [superficie]: tratamiento };
    }

    setEstadoPorPaciente((previo) => {
      const estadoPaciente = previo[pacienteActivo.id] ?? {};
      return {
        ...previo,
        [pacienteActivo.id]: { ...estadoPaciente, [numeroDiente]: nuevasSuperficies },
      };
    });

    registrarHallazgo(numeroDiente, superficie, tratamiento);
    setSeleccionActiva(null);
  }

  function manejarClicSuperficie(numeroDiente: number, superficie: Superficie) {
    // Atajo de flujo: si ya hay un tratamiento seleccionado en la leyenda,
    // aplicarlo directamente sin abrir el popover — agiliza el registro de
    // varios hallazgos consecutivos del mismo tipo.
    if (tratamientoActivo) {
      aplicarTratamiento(numeroDiente, superficie, tratamientoActivo);
      return;
    }
    abrirPopover(numeroDiente, superficie);
  }

  const seleccionParaPopover = useMemo(() => {
    if (!seleccionActiva) return null;
    return {
      numeroDiente: seleccionActiva.numeroDiente,
      superficie: seleccionActiva.superficie,
      tratamientoActual: obtenerEstadoDiente(seleccionActiva.numeroDiente)[seleccionActiva.superficie],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionActiva, estadoOdontogramaActual]);

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      {/* Encabezado: buscador de pacientes + selector de dentición */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Odontograma IA</h1>
          <p className="text-sm text-slate-500">
            {pacienteActivo.nombre} · {pacienteActivo.edad} años
          </p>
        </div>
        <BuscadorPacientes pacienteActivo={pacienteActivo} onSeleccionar={manejarSeleccionPaciente} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Columna principal: mapa dental + historial */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{ETIQUETAS_DENTICION[tipoDenticion]}</h2>

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(['adulta', 'infantil'] as TipoDenticion[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoDenticion(tipo)}
                    aria-pressed={tipoDenticion === tipo}
                    className={[
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      tipoDenticion === tipo ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                  >
                    {tipo === 'adulta' ? 'Dentición Adulta' : 'Dentición Infantil'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fila superior — cuadrantes 1/2 (adulta) o 5/6 (infantil) */}
            <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200 pb-6">
              {layoutActual.filaSuperior.map((cuadrante, indice) => (
                <div
                  key={cuadrante.etiqueta}
                  className={indice === 0 ? 'border-r border-dashed border-slate-200 pr-3' : 'pl-3'}
                >
                  <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {cuadrante.etiqueta}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {cuadrante.numeros.map((numero) => (
                      <Diente
                        key={numero}
                        numero={numero}
                        estado={obtenerEstadoDiente(numero)}
                        onClickSuperficie={manejarClicSuperficie}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Fila inferior — cuadrantes 4/3 (adulta) o 8/7 (infantil) */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              {layoutActual.filaInferior.map((cuadrante, indice) => (
                <div
                  key={cuadrante.etiqueta}
                  className={indice === 0 ? 'border-r border-dashed border-slate-200 pr-3' : 'pl-3'}
                >
                  <div className="flex flex-wrap justify-center gap-2">
                    {cuadrante.numeros.map((numero) => (
                      <Diente
                        key={numero}
                        numero={numero}
                        estado={obtenerEstadoDiente(numero)}
                        onClickSuperficie={manejarClicSuperficie}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {cuadrante.etiqueta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <HistorialEvolucion hallazgos={historialActual} />
        </div>

        {/* Columna lateral: leyenda de tratamientos */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <LeyendaTratamientos
            tratamientoActivo={tratamientoActivo}
            onSeleccionar={(tratamiento) =>
              setTratamientoActivo((previo) => (previo === tratamiento ? null : tratamiento))
            }
          />
        </div>
      </div>

      {seleccionParaPopover && (
        <PopoverSuperficie
          seleccion={seleccionParaPopover}
          onAplicar={(tratamiento) =>
            aplicarTratamiento(seleccionParaPopover.numeroDiente, seleccionParaPopover.superficie, tratamiento)
          }
          onCerrar={cerrarPopover}
        />
      )}
    </div>
  );
}
