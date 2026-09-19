'use client';

import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { BookingCalendar, type BookingCalendarProps, type SeleccionCita } from './BookingCalendar';
import type { ApiRespuesta, Cita, CrearCitaInput } from '@/types';

/**
 * PatientForm — flujo completo de reservación del paciente:
 * calendario (BookingCalendar) + datos de contacto + POST a
 * /api/booking/crear-cita, con los estados visuales: cargando (spinner),
 * éxito (aviso verde) y colisión de horario (modal rojo).
 *
 * El formulario de datos ("Paso 3") solo se revela una vez que el paciente
 * elige fecha + hora en el calendario — antes de eso, solo ve el proceso de
 * selección, siguiendo el patrón de reserva progresiva pedido en el diseño.
 */

interface PatientFormProps {
  /** id_medico con el que se agendará la cita (columna A de la pestaña "Medicos"). */
  idMedico: string;
  /** Nombre del médico, solo para mostrarlo en el encabezado. Opcional. */
  nombreMedico?: string;
  /** Overrides opcionales para BookingCalendar (p. ej. el horario real del médico). */
  calendario?: Omit<BookingCalendarProps, 'onSeleccionCompleta'>;
}

type EstadoEnvio = 'idle' | 'cargando' | 'exito' | 'error';

interface ErroresCampos {
  nombre?: string;
  telefono?: string;
  correo?: string;
}

const REGEX_TELEFONO = /^\+?[0-9()\-\s]{10,20}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatearFechaLegible(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const texto = fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function PatientForm({ idMedico, nombreMedico, calendario }: PatientFormProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [seleccion, setSeleccion] = useState<SeleccionCita | null>(null);

  const [estado, setEstado] = useState<EstadoEnvio>('idle');
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mostrarModalColision, setMostrarModalColision] = useState(false);
  const [citaConfirmada, setCitaConfirmada] = useState<Cita | null>(null);

  // Cambia cada vez que necesitamos "resetear" visualmente el calendario
  // (p. ej. tras una colisión de horario). Ver comentario en BookingCalendar.tsx.
  const [calendarioKey, setCalendarioKey] = useState(0);

  function validarCampos(): boolean {
    const nuevosErrores: ErroresCampos = {};

    if (nombre.trim().length < 2) {
      nuevosErrores.nombre = 'Escribe tu nombre completo.';
    }
    if (!REGEX_TELEFONO.test(telefono.trim())) {
      nuevosErrores.telefono = 'Ingresa un teléfono válido (10 dígitos).';
    }
    if (!REGEX_CORREO.test(correo.trim())) {
      nuevosErrores.correo = 'Ingresa un correo electrónico válido.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccion || !validarCampos()) return;

    setEstado('cargando');
    setMensajeError(null);

    const payload: CrearCitaInput = {
      id_medico: idMedico,
      nombre_paciente: nombre.trim(),
      telefono_paciente: telefono.trim(),
      correo_paciente: correo.trim(),
      fecha: seleccion.fecha,
      hora: seleccion.hora,
    };

    try {
      const respuesta = await fetch('/api/booking/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiRespuesta<Cita> = await respuesta.json();

      if (respuesta.status === 409) {
        setEstado('idle');
        setMensajeError(json.error ?? 'Ese horario ya no está disponible.');
        setMostrarModalColision(true);
        return;
      }

      if (!respuesta.ok || !json.ok || !json.data) {
        setEstado('error');
        setMensajeError(json.error ?? 'No fue posible agendar la cita. Intenta de nuevo.');
        return;
      }

      setCitaConfirmada(json.data);
      setEstado('exito');
    } catch (error) {
      console.error('[PatientForm] Error de red al crear la cita:', error);
      setEstado('error');
      setMensajeError('No se pudo conectar con el servidor. Verifica tu internet e intenta de nuevo.');
    }
  }

  function elegirOtroHorario() {
    setMostrarModalColision(false);
    setSeleccion(null);
    setCalendarioKey((k) => k + 1); // fuerza a BookingCalendar a reiniciar su selección visual
  }

  function agendarOtraCita() {
    setNombre('');
    setTelefono('');
    setCorreo('');
    setSeleccion(null);
    setErrores({});
    setMensajeError(null);
    setCitaConfirmada(null);
    setEstado('idle');
    setCalendarioKey((k) => k + 1);
  }

  // ---------------------------------------------------------------------
  // Estado: éxito — reemplaza el flujo por un aviso de confirmación.
  // ---------------------------------------------------------------------
  if (estado === 'exito' && citaConfirmada) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-800">¡Tu cita quedó confirmada!</h3>
        <p className="mt-1 text-sm text-emerald-700">
          Enviamos la confirmación por WhatsApp y correo electrónico a {citaConfirmada.correo_paciente}.
        </p>

        <div className="mx-auto mt-4 max-w-xs rounded-2xl bg-white p-4 text-left text-sm shadow-sm">
          <p className="flex justify-between py-1">
            <span className="text-slate-500">Fecha</span>
            <span className="font-medium text-slate-800">{formatearFechaLegible(citaConfirmada.fecha)}</span>
          </p>
          <p className="flex justify-between border-t border-slate-100 py-1">
            <span className="text-slate-500">Hora</span>
            <span className="font-medium text-slate-800">{citaConfirmada.hora} hrs</span>
          </p>
          <p className="flex justify-between border-t border-slate-100 py-1">
            <span className="text-slate-500">Folio</span>
            <span className="font-medium text-slate-800">{citaConfirmada.id_cita}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={agendarOtraCita}
          className="mt-5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          Agendar otra cita
        </button>
      </div>
    );
  }

  const cargando = estado === 'cargando';

  return (
    <div className="relative space-y-5">
      {nombreMedico && (
        <p className="text-sm text-slate-500">
          Agendando cita con <span className="font-medium text-slate-800">{nombreMedico}</span>
        </p>
      )}

      <BookingCalendar key={calendarioKey} {...calendario} onSeleccionCompleta={setSeleccion} />

      {/* Paso 3 — solo aparece una vez que se elige fecha + hora */}
      {seleccion && (
        <form
          onSubmit={manejarEnvio}
          className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                3
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirma tu cita</h3>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {formatearFechaLegible(seleccion.fecha)} · {seleccion.hora} hrs
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="nombre_paciente" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                id="nombre_paciente"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. María Fernanda López"
                disabled={cargando}
                className={[
                  'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errores.nombre ? 'border-red-300' : 'border-slate-200',
                ].join(' ')}
              />
              {errores.nombre && <p className="mt-1 text-xs text-red-600">{errores.nombre}</p>}
            </div>

            <div>
              <label htmlFor="telefono_paciente" className="mb-1 block text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <input
                id="telefono_paciente"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 55 1234 5678"
                disabled={cargando}
                className={[
                  'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errores.telefono ? 'border-red-300' : 'border-slate-200',
                ].join(' ')}
              />
              {errores.telefono && <p className="mt-1 text-xs text-red-600">{errores.telefono}</p>}
            </div>

            <div>
              <label htmlFor="correo_paciente" className="mb-1 block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                id="correo_paciente"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ej. maria@correo.com"
                disabled={cargando}
                className={[
                  'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  errores.correo ? 'border-red-300' : 'border-slate-200',
                ].join(' ')}
              />
              {errores.correo && <p className="mt-1 text-xs text-red-600">{errores.correo}</p>}
            </div>
          </div>

          {estado === 'error' && mensajeError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{mensajeError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Agendando tu cita…
              </>
            ) : (
              'Confirmar cita'
            )}
          </button>
        </form>
      )}

      {/* Modal de colisión de horario */}
      {mostrarModalColision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={elegirOtroHorario}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-slate-800">Ese horario ya no está disponible</h3>
            <p className="mt-1 text-sm text-slate-500">
              {mensajeError ?? 'Otro paciente reservó este horario justo antes que tú. Por favor elige otro.'}
            </p>

            <button
              type="button"
              onClick={elegirOtroHorario}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Elegir otro horario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
