'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Clock, Loader2, MapPin, Phone, Save } from 'lucide-react';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { ApiRespuesta, ConfiguracionConsultorio, DiaSemana, GuardarConsultorioInput } from '@/types';

interface FormularioConsultorioProps {
  /** Configuración ya guardada (o `null` si el médico todavía no ha guardado nada). */
  consultorioInicial: ConfiguracionConsultorio | null;
}

interface ErroresFormulario {
  nombreClinica?: string;
  telefonoComercial?: string;
  direccionFisica?: string;
  diasAtencion?: string;
  horas?: string;
}

const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;

const DIAS_SEMANA: { valor: DiaSemana; etiqueta: string }[] = [
  { valor: 'lunes', etiqueta: 'Lun' },
  { valor: 'martes', etiqueta: 'Mar' },
  { valor: 'miercoles', etiqueta: 'Mié' },
  { valor: 'jueves', etiqueta: 'Jue' },
  { valor: 'viernes', etiqueta: 'Vie' },
  { valor: 'sabado', etiqueta: 'Sáb' },
  { valor: 'domingo', etiqueta: 'Dom' },
];

function validarFormulario(
  nombreClinica: string,
  telefonoComercial: string,
  direccionFisica: string,
  diasAtencion: DiaSemana[],
  horaApertura: string,
  horaCierre: string,
): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (nombreClinica.trim().length < 2) {
    errores.nombreClinica = 'Escribe el nombre de tu clínica o consultorio.';
  }
  if (!REGEX_TELEFONO.test(telefonoComercial.trim())) {
    errores.telefonoComercial = 'Escribe un teléfono válido (7-20 caracteres).';
  }
  if (direccionFisica.trim().length < 5) {
    errores.direccionFisica = 'Escribe la dirección física completa.';
  }
  if (diasAtencion.length === 0) {
    errores.diasAtencion = 'Selecciona al menos un día de atención.';
  }
  if (horaCierre <= horaApertura) {
    errores.horas = 'La hora de cierre debe ser posterior a la hora de apertura.';
  }

  return errores;
}

/**
 * Formulario premium "Mi Consultorio" — captura datos de contacto real,
 * dirección física y horario general de atención, y los guarda de forma
 * asíncrona (upsert) en la pestaña "Consultorios" de Google Sheets vía
 * `POST /api/consultorio/guardar`.
 */
export function FormularioConsultorio({ consultorioInicial }: FormularioConsultorioProps) {
  const [nombreClinica, setNombreClinica] = useState(consultorioInicial?.nombre_clinica ?? '');
  const [telefonoComercial, setTelefonoComercial] = useState(consultorioInicial?.telefono_comercial ?? '');
  const [direccionFisica, setDireccionFisica] = useState(consultorioInicial?.direccion_fisica ?? '');
  const [diasAtencion, setDiasAtencion] = useState<DiaSemana[]>(consultorioInicial?.dias_atencion ?? []);
  const [horaApertura, setHoraApertura] = useState(consultorioInicial?.horas_atencion.horaApertura ?? '09:00');
  const [horaCierre, setHoraCierre] = useState(consultorioInicial?.horas_atencion.horaCierre ?? '18:00');

  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  function alternarDia(dia: DiaSemana): void {
    setDiasAtencion((actuales) =>
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia],
    );
  }

  function mostrarToast(tipo: 'exito' | 'error', mensaje: string): void {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), AUTO_CIERRE_TOAST_FLOTANTE_MS);
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (guardando) return;

    const erroresEncontrados = validarFormulario(
      nombreClinica,
      telefonoComercial,
      direccionFisica,
      diasAtencion,
      horaApertura,
      horaCierre,
    );
    setErrores(erroresEncontrados);

    if (Object.keys(erroresEncontrados).length > 0) return;

    const payload: GuardarConsultorioInput = {
      nombreClinica: nombreClinica.trim(),
      telefonoComercial: telefonoComercial.trim(),
      direccionFisica: direccionFisica.trim(),
      diasAtencion,
      horaApertura,
      horaCierre,
    };

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/consultorio/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<ConfiguracionConsultorio> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        mostrarToast('error', cuerpo.error ?? 'Ocurrió un error inesperado al guardar. Intenta de nuevo.');
        return;
      }

      mostrarToast('exito', 'Los datos de tu consultorio se guardaron correctamente.');
    } catch (error) {
      console.error('[FormularioConsultorio] Error de red guardando el consultorio:', error);
      mostrarToast('error', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <form
        onSubmit={manejarEnvio}
        className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8"
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="nombreClinica" className="mb-1.5 block text-sm font-medium text-slate-700">
              Nombre de la clínica <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                errores.nombreClinica ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="nombreClinica"
                type="text"
                value={nombreClinica}
                onChange={(evento) => setNombreClinica(evento.target.value)}
                placeholder="Ej. Clínica Dental Sonrisas"
                className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {errores.nombreClinica && <p className="mt-1.5 text-xs text-red-500">{errores.nombreClinica}</p>}
          </div>

          <div>
            <label htmlFor="telefonoComercial" className="mb-1.5 block text-sm font-medium text-slate-700">
              Teléfono comercial <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                errores.telefonoComercial ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="telefonoComercial"
                type="tel"
                value={telefonoComercial}
                onChange={(evento) => setTelefonoComercial(evento.target.value)}
                placeholder="Ej. 871 123 4567"
                className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {errores.telefonoComercial && <p className="mt-1.5 text-xs text-red-500">{errores.telefonoComercial}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="direccionFisica" className="mb-1.5 block text-sm font-medium text-slate-700">
              Dirección física <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-start gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                errores.direccionFisica ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <textarea
                id="direccionFisica"
                value={direccionFisica}
                onChange={(evento) => setDireccionFisica(evento.target.value)}
                placeholder="Ej. Blvd. Independencia 123, Col. Centro, Torreón, Coahuila"
                rows={2}
                className="w-full flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {errores.direccionFisica && <p className="mt-1.5 text-xs text-red-500">{errores.direccionFisica}</p>}
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Días de atención <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(({ valor, etiqueta }) => {
                const seleccionado = diasAtencion.includes(valor);
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => alternarDia(valor)}
                    className={[
                      'rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                      seleccionado
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
            {errores.diasAtencion && <p className="mt-1.5 text-xs text-red-500">{errores.diasAtencion}</p>}
          </div>

          <div>
            <label htmlFor="horaApertura" className="mb-1.5 block text-sm font-medium text-slate-700">
              Hora de apertura <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                errores.horas ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="horaApertura"
                type="time"
                value={horaApertura}
                onChange={(evento) => setHoraApertura(evento.target.value)}
                className="w-full flex-1 bg-transparent text-sm text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="horaCierre" className="mb-1.5 block text-sm font-medium text-slate-700">
              Hora de cierre <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                errores.horas ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="horaCierre"
                type="time"
                value={horaCierre}
                onChange={(evento) => setHoraCierre(evento.target.value)}
                className="w-full flex-1 bg-transparent text-sm text-slate-700 focus:outline-none"
              />
            </div>
            {errores.horas && <p className="mt-1.5 text-xs text-red-500">{errores.horas}</p>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <p className="mr-auto text-xs text-slate-400">
            <span className="text-red-500">*</span> Campos requeridos.
          </p>

          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardando ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      {toast && (
        <ToastFlotante
          tipo={toast.tipo}
          titulo={toast.tipo === 'exito' ? 'Consultorio actualizado' : 'No se pudo guardar'}
          mensaje={toast.mensaje}
          onCerrar={() => setToast(null)}
        />
      )}
    </>
  );
}
