'use client';

import { useMemo, useState } from 'react';
import type { DiaSemana, HorarioConfig, HorarioDia } from '@/types';

/**
 * BookingCalendar — selector visual de fecha + hora para agendar una cita.
 * Look & feel: SaaS médico premium (franja horizontal de días + selector de
 * fecha + grid de horarios), estilo Clinikdent Pro.
 *
 * Sigue siendo un componente "no controlado": administra su propio estado
 * interno de día/hora seleccionados y notifica al padre únicamente cuando la
 * selección está completa, vía `onSeleccionCompleta`. Para forzar un reinicio
 * visual (p. ej. tras una colisión de horario en `PatientForm`), el padre
 * remonta este componente cambiando su prop `key`.
 *
 * Modo "horario real del médico": si se recibe `horarioSemanal` (el
 * `horario_config` de la pestaña "Medicos"), cada día usa SU PROPIO
 * inicio/fin/duración y los días con `activo: false` quedan deshabilitados
 * automáticamente. Si no se recibe, cae en el modo simple controlado por
 * `horaInicio` / `horaFin` / `intervaloMinutos` / `diasNoDisponibles`.
 */

export interface SeleccionCita {
  /** Formato "YYYY-MM-DD" */
  fecha: string;
  /** Formato "HH:mm", 24 horas */
  hora: string;
}

export interface BookingCalendarProps {
  /** Se invoca cada vez que cambia la selección. `null` mientras esté incompleta. */
  onSeleccionCompleta: (seleccion: SeleccionCita | null) => void;
  /** Horario real del médico (`medico.horario_config`). Si se provee, tiene prioridad. */
  horarioSemanal?: HorarioConfig;
  /** Hora de inicio de la jornada ("HH:mm"), usada si no hay `horarioSemanal`. Default "09:00". */
  horaInicio?: string;
  /** Hora de fin de la jornada ("HH:mm"), usada si no hay `horarioSemanal`. Default "18:00". */
  horaFin?: string;
  /** Duración de cada franja en minutos, usada si no hay `horarioSemanal`. Default 30. */
  intervaloMinutos?: number;
  /** Días no disponibles (0=domingo…6=sábado), usado si no hay `horarioSemanal`. Default [0]. */
  diasNoDisponibles?: number[];
  /** Horarios ya ocupados ("HH:mm") para el día actualmente seleccionado. */
  horariosOcupados?: string[];
  /** Cuántos meses hacia adelante puede navegar el selector de fecha. Default 2. */
  mesesHaciaAdelante?: number;
  /** Cuántos días se muestran en la franja horizontal. Default 14. */
  diasVisiblesEnFranja?: number;
}

const CLAVES_DIA_POR_GETDAY: DiaSemana[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

function esMismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function configDelDia(fecha: Date, horarioSemanal?: HorarioConfig): HorarioDia | undefined {
  if (!horarioSemanal) return undefined;
  return horarioSemanal[CLAVES_DIA_POR_GETDAY[fecha.getDay()]];
}

function calcularDiaDeshabilitado(
  fecha: Date,
  hoy: Date,
  horarioSemanal: HorarioConfig | undefined,
  diasNoDisponibles: number[],
): boolean {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (fecha.getTime() < inicioHoy.getTime()) return true;

  if (horarioSemanal) {
    return !configDelDia(fecha, horarioSemanal)?.activo;
  }
  return diasNoDisponibles.includes(fecha.getDay());
}

function generarFranjasHorarias(horaInicio: string, horaFin: string, intervaloMinutos: number): string[] {
  const [hIni, mIni] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);

  const franjas: string[] = [];
  let minutosActuales = hIni * 60 + mIni;
  const minutosFin = hFin * 60 + mFin;

  while (minutosActuales < minutosFin) {
    const h = Math.floor(minutosActuales / 60);
    const m = minutosActuales % 60;
    franjas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    minutosActuales += intervaloMinutos;
  }

  return franjas;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function BookingCalendar({
  onSeleccionCompleta,
  horarioSemanal,
  horaInicio = '09:00',
  horaFin = '18:00',
  intervaloMinutos = 30,
  diasNoDisponibles = [0],
  horariosOcupados = [],
  mesesHaciaAdelante = 2,
  diasVisiblesEnFranja = 14,
}: BookingCalendarProps) {
  const hoy = useMemo(() => new Date(), []);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  const diasFranja = useMemo(() => {
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Array.from(
      { length: diasVisiblesEnFranja },
      (_, i) => new Date(inicioHoy.getFullYear(), inicioHoy.getMonth(), inicioHoy.getDate() + i),
    );
  }, [hoy, diasVisiblesEnFranja]);

  const fechaMinima = useMemo(() => formatearFechaISO(hoy), [hoy]);
  const fechaMaxima = useMemo(
    () => formatearFechaISO(new Date(hoy.getFullYear(), hoy.getMonth() + mesesHaciaAdelante, hoy.getDate())),
    [hoy, mesesHaciaAdelante],
  );

  function manejarClicDia(fecha: Date) {
    if (calcularDiaDeshabilitado(fecha, hoy, horarioSemanal, diasNoDisponibles)) return;
    setDiaSeleccionado(fecha);
    setHoraSeleccionada(null);
    onSeleccionCompleta(null);
  }

  function manejarCambioInputFecha(valor: string) {
    if (!valor) return;
    const [anio, mes, dia] = valor.split('-').map(Number);
    manejarClicDia(new Date(anio, mes - 1, dia));
  }

  function manejarClicHora(hora: string) {
    if (!diaSeleccionado) return;
    setHoraSeleccionada(hora);
    onSeleccionCompleta({ fecha: formatearFechaISO(diaSeleccionado), hora });
  }

  const franjasHorarias = useMemo(() => {
    if (!diaSeleccionado) return [];

    const config = configDelDia(diaSeleccionado, horarioSemanal);
    const inicio = config?.inicio ?? horaInicio;
    const fin = config?.fin ?? horaFin;
    const intervalo = config?.duracionCitaMinutos ?? intervaloMinutos;

    const todas = generarFranjasHorarias(inicio, fin, intervalo);

    if (!esMismoDia(diaSeleccionado, hoy)) return todas;

    const minutosAhora = hoy.getHours() * 60 + hoy.getMinutes();
    return todas.filter((franja) => {
      const [h, m] = franja.split(':').map(Number);
      return h * 60 + m > minutosAhora;
    });
  }, [diaSeleccionado, hoy, horaInicio, horaFin, intervaloMinutos, horarioSemanal]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      {/* Paso 1 — selección de día */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
          1
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Selecciona el día de tu consulta
        </h3>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {diasFranja.map((fecha) => {
            const deshabilitado = calcularDiaDeshabilitado(fecha, hoy, horarioSemanal, diasNoDisponibles);
            const seleccionado = Boolean(diaSeleccionado && esMismoDia(fecha, diaSeleccionado));

            return (
              <button
                key={fecha.toISOString()}
                type="button"
                onClick={() => manejarClicDia(fecha)}
                disabled={deshabilitado}
                className={[
                  'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3.5 py-2.5 text-center transition',
                  seleccionado
                    ? 'bg-primary text-white shadow-sm'
                    : deshabilitado
                      ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary',
                ].join(' ')}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {fecha.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="text-sm font-bold">
                  {fecha.getDate()} {fecha.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="date"
          value={diaSeleccionado ? formatearFechaISO(diaSeleccionado) : ''}
          min={fechaMinima}
          max={fechaMaxima}
          onChange={(e) => manejarCambioInputFecha(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Paso 2 — selección de hora */}
      {diaSeleccionado && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              2
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Elige el horario disponible
            </h3>
          </div>

          <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" /> Ocupado
            </span>
          </div>

          {franjasHorarias.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              No hay horarios disponibles para {capitalizar(diaSeleccionado.toLocaleDateString('es-MX', { weekday: 'long' }))}. Elige otra fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {franjasHorarias.map((hora) => {
                const ocupado = horariosOcupados.includes(hora);
                const seleccionada = horaSeleccionada === hora;

                return (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => !ocupado && manejarClicHora(hora)}
                    disabled={ocupado}
                    className={[
                      'rounded-xl border px-2 py-2.5 text-sm font-semibold transition',
                      seleccionada
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : ocupado
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                          : 'border-slate-200 text-slate-600 hover:border-primary hover:bg-primary/5 hover:text-primary',
                    ].join(' ')}
                  >
                    {hora} hrs
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!horaSeleccionada && (
        <p className="mt-5 text-center text-xs text-slate-400">
          Haz clic en cualquier horario en azul para pasar al formulario de confirmación con tus datos.
        </p>
      )}
    </div>
  );
}
