'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { BuscadorPacientes } from '@/components/odontograma/BuscadorPacientes';
import { Diente } from '@/components/odontograma/Diente';
import { HistorialEvolucion } from '@/components/odontograma/HistorialEvolucion';
import { LeyendaTratamientos } from '@/components/odontograma/LeyendaTratamientos';
import { PopoverSuperficie } from '@/components/odontograma/PopoverSuperficie';
import { AUTO_CIERRE_TOAST_MS, ToastGuardado } from '@/components/odontograma/ToastGuardado';
import type { TipoToast } from '@/components/odontograma/ToastGuardado';
import {
  ETIQUETAS_DENTICION,
  LAYOUT_DENTICION,
  PACIENTES_DEMO,
  construirNotasEvolucion,
  crearSuperficiesSanas,
} from '@/components/odontograma/tipos';
import type {
  EstadoOdontograma,
  EstadoSuperficies,
  HallazgoHistorial,
  PacienteOdontograma,
  Superficie,
  TipoDenticion,
  TratamientoId,
} from '@/components/odontograma/tipos';
import type { ApiRespuesta } from '@/types';

interface SeleccionActiva {
  numeroDiente: number;
  superficie: Superficie;
}

interface ConsultaOdontogramaApi {
  estado: EstadoOdontograma;
  fecha: string;
  notasEvolucion: string;
}

interface GuardarOdontogramaApi {
  idOdontograma: string;
}

interface EstadoToast {
  tipo: TipoToast;
  mensaje: string;
}

interface OdontogramaModuleProps {
  /** Paciente con el que abre el módulo (el primero de la lista de demostración). */
  pacienteInicial: PacienteOdontograma;
  /**
   * Último odontograma real de `pacienteInicial`, ya leído de Google Sheets
   * por el Server Component (`page.tsx`) — evita un "parpadeo" de piezas
   * sanas seguido de la carga real al montar. `null` si ese paciente nunca
   * se ha guardado.
   */
  estadoInicial: EstadoOdontograma | null;
}

/*
 * Nota de diseño: este componente NO recibe `idMedico` como prop. El
 * `id_medico` que queda escrito en cada fila de "Odontogramas" lo resuelve
 * siempre `POST /api/odontograma/guardar` del lado del servidor, a partir
 * de la cookie de sesión firmada (`obtenerIdMedicoSesion()`) — nunca de un
 * valor que el cliente pudiera mandar en el body, que sería fácil de
 * falsificar.
 */

/**
 * Orquestador principal del Módulo de Odontograma IA e Historial Clínico.
 *
 * PERSISTENCIA REAL (este paso): el estado de cada paciente se guarda en la
 * pestaña "Odontogramas" de Google Sheets al hacer clic en "Guardar
 * Evolución" (`POST /api/odontograma/guardar`), y se recupera:
 *
 *  - Para el paciente con el que abre la página: server-side, en
 *    `page.tsx`, inyectado aquí vía la prop `estadoInicial`.
 *  - Para cualquier OTRO paciente al que el dentista cambie desde el
 *    buscador: cliente-side, con un `fetch` a `GET
 *    /api/odontograma/:idPaciente` (ver `cargarHistorialPaciente` abajo),
 *    ya que ese cambio ocurre sin navegación/recarga de página.
 *
 * El "Historial de Evolución" que se ve en pantalla sigue siendo solo de la
 * SESIÓN actual (los clics hechos desde que se abrió la página) — lo que
 * cambia es que ahora, al guardar, ese resumen se escribe en la columna
 * `notas_evolucion` y las piezas quedan persistidas de verdad.
 */
export function OdontogramaModule({ pacienteInicial, estadoInicial }: OdontogramaModuleProps) {
  const [pacienteActivo, setPacienteActivo] = useState<PacienteOdontograma>(pacienteInicial);
  const [tipoDenticion, setTipoDenticion] = useState<TipoDenticion>(pacienteInicial.denticionSugerida);
  const [tratamientoActivo, setTratamientoActivo] = useState<TratamientoId | null>(null);
  const [estadoPorPaciente, setEstadoPorPaciente] = useState<Record<string, EstadoOdontograma>>(
    estadoInicial ? { [pacienteInicial.id]: estadoInicial } : {},
  );
  const [historialPorPaciente, setHistorialPorPaciente] = useState<Record<string, HallazgoHistorial[]>>({});
  const [seleccionActiva, setSeleccionActiva] = useState<SeleccionActiva | null>(null);

  // Pacientes cuyo historial ya se intentó cargar desde Google Sheets (éxito
  // o vacío, da igual) — evita volver a hacer `fetch` cada vez que el
  // dentista regresa al mismo paciente durante la misma visita a la página.
  const [pacientesCargados, setPacientesCargados] = useState<Set<string>>(new Set([pacienteInicial.id]));
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<EstadoToast | null>(null);
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contador simple para IDs de hallazgo únicos dentro de la sesión — evita
  // depender de `crypto.randomUUID()` (no disponible en todos los entornos
  // de renderizado) solo para una clave de lista de React.
  const contadorHallazgos = useRef(0);

  useEffect(() => {
    return () => {
      if (temporizadorToast.current) clearTimeout(temporizadorToast.current);
    };
  }, []);

  const layoutActual = LAYOUT_DENTICION[tipoDenticion];
  const estadoOdontogramaActual = estadoPorPaciente[pacienteActivo.id] ?? {};
  const historialActual = historialPorPaciente[pacienteActivo.id] ?? [];

  function obtenerEstadoDiente(numero: number): EstadoSuperficies {
    return estadoOdontogramaActual[numero] ?? crearSuperficiesSanas();
  }

  function mostrarToast(tipo: TipoToast, mensaje: string) {
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current);
    setToast({ tipo, mensaje });
    temporizadorToast.current = setTimeout(() => setToast(null), AUTO_CIERRE_TOAST_MS);
  }

  /**
   * Trae de Google Sheets (vía la API route) el último odontograma
   * guardado de `paciente`, si aún no se ha cargado en esta visita a la
   * página. Se dispara al seleccionar un paciente en el buscador.
   */
  async function cargarHistorialPaciente(paciente: PacienteOdontograma): Promise<void> {
    if (pacientesCargados.has(paciente.id)) return;

    setCargandoHistorial(true);
    try {
      const respuesta = await fetch(`/api/odontograma/${encodeURIComponent(paciente.id)}`, {
        method: 'GET',
      });
      const cuerpo: ApiRespuesta<ConsultaOdontogramaApi | null> = await respuesta.json();

      if (respuesta.ok && cuerpo.ok && cuerpo.data) {
        setEstadoPorPaciente((previo) => ({ ...previo, [paciente.id]: cuerpo.data!.estado }));
      } else if (!cuerpo.ok) {
        console.error('[OdontogramaModule] No se pudo cargar el historial del paciente:', cuerpo.error);
      }
      // `cuerpo.data === null` es un caso válido: el paciente nunca se ha guardado, no hay nada que inyectar.
    } catch (error) {
      console.error('[OdontogramaModule] Error de red cargando el historial del paciente:', error);
    } finally {
      setPacientesCargados((previo) => new Set(previo).add(paciente.id));
      setCargandoHistorial(false);
    }
  }

  function manejarSeleccionPaciente(paciente: PacienteOdontograma) {
    setPacienteActivo(paciente);
    setTipoDenticion(paciente.denticionSugerida);
    setSeleccionActiva(null);
    void cargarHistorialPaciente(paciente);
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
   * parcial de una sola superficie (una pieza extraída no tiene sentido con
   * una cara "sana" y otra "ausente" al mismo tiempo), así que se propaga a
   * las 5 superficies de la pieza de una sola vez.
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

  /**
   * "Guardar Evolución" — inserta un nuevo snapshot del odontograma del
   * paciente activo en Google Sheets (`POST /api/odontograma/guardar`).
   * `notas_evolucion` se compone a partir de los hallazgos de la sesión
   * actual (ver `construirNotasEvolucion`).
   */
  async function guardarEvolucion(): Promise<void> {
    if (guardando) return;

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/odontograma/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPaciente: pacienteActivo.id,
          estado: estadoOdontogramaActual,
          notasEvolucion: construirNotasEvolucion(historialActual),
        }),
      });

      const cuerpo: ApiRespuesta<GuardarOdontogramaApi> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        mostrarToast('error', cuerpo.error ?? 'Ocurrió un error inesperado al guardar. Intenta de nuevo.');
        return;
      }

      mostrarToast('exito', `El odontograma de ${pacienteActivo.nombre} se guardó correctamente en Google Sheets.`);
    } catch (error) {
      console.error('[OdontogramaModule] Error de red guardando la evolución:', error);
      mostrarToast('error', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
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
      {/* Encabezado: título + buscador de pacientes + botón "Guardar Evolución" */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Odontograma IA</h1>
          <p className="text-sm text-slate-500">
            {pacienteActivo.nombre} · {pacienteActivo.edad} años
            {cargandoHistorial && <span className="ml-2 text-primary">· Cargando historial clínico…</span>}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <BuscadorPacientes pacienteActivo={pacienteActivo} onSeleccionar={manejarSeleccionPaciente} />

          <button
            type="button"
            onClick={guardarEvolucion}
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardando ? 'Guardando…' : 'Guardar Evolución'}
          </button>
        </div>
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

      {toast && <ToastGuardado tipo={toast.tipo} mensaje={toast.mensaje} onCerrar={() => setToast(null)} />}
    </div>
  );
}
