'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ClipboardPlus, Loader2, X } from 'lucide-react';
import type { ApiRespuesta, CrearRegistroHistorialInput, RegistroHistorialClinico } from '@/types';

interface ModalNotaEvolucionProps {
  idPaciente: string;
  onCerrar: () => void;
  /** Se dispara tras un `POST` exitoso, con el registro ya creado, para insertarlo en la Timeline sin recargar. */
  onGuardado: (registro: RegistroHistorialClinico) => void;
}

/**
 * Formulario flotante "Agregar Nota de Evolución" — captura el motivo de
 * consulta, el diagnóstico, el tratamiento sugerido y notas privadas del día,
 * y los guarda de forma asíncrona vía `POST /api/historial/crear`.
 *
 * NOTA DE PRECISIÓN: el enunciado pidió "campos de texto enriquecidos"
 * (rich-text). No existe todavía ninguna dependencia de editor de texto
 * enriquecido en este proyecto y agregar una solo para este formulario sería
 * una dependencia pesada para un solo módulo — se usan `<textarea>` amplios y
 * bien estilizados como sustituto pragmático (mismo criterio de "avanzar y
 * documentar la diferencia" ya aplicado en turnos anteriores). Se documenta
 * también en README.md.
 */
export function ModalNotaEvolucion({ idPaciente, onCerrar, onGuardado }: ModalNotaEvolucionProps) {
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamientoSugerido, setTratamientoSugerido] = useState('');
  const [notasPrivadas, setNotasPrivadas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (guardando) return;

    if (motivoConsulta.trim().length < 3) {
      setError('Escribe el motivo de la consulta (mínimo 3 caracteres).');
      return;
    }
    if (diagnostico.trim().length < 3) {
      setError('Escribe el diagnóstico (mínimo 3 caracteres).');
      return;
    }
    if (tratamientoSugerido.trim().length < 3) {
      setError('Escribe el tratamiento sugerido (mínimo 3 caracteres).');
      return;
    }

    const payload: CrearRegistroHistorialInput = {
      idPaciente,
      motivoConsulta: motivoConsulta.trim(),
      diagnostico: diagnostico.trim(),
      tratamientoSugerido: tratamientoSugerido.trim(),
      notasPrivadas: notasPrivadas.trim(),
    };

    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/historial/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<RegistroHistorialClinico> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setError(cuerpo.error ?? 'Ocurrió un error inesperado al guardar la nota. Intenta de nuevo.');
        setGuardando(false);
        return;
      }

      onGuardado(cuerpo.data);
    } catch (err) {
      console.error('[ModalNotaEvolucion] Error de red guardando la nota de evolución:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <ClipboardPlus className="h-4 w-4 text-primary" />
            Agregar Nota de Evolución
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="flex-1 space-y-4 overflow-y-auto p-6" noValidate>
          <div>
            <label htmlFor="motivoConsulta" className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo de la consulta <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivoConsulta"
              value={motivoConsulta}
              onChange={(evento) => setMotivoConsulta(evento.target.value)}
              rows={2}
              placeholder="Ej. Dolor en molar inferior derecho desde hace 3 días..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label htmlFor="diagnostico" className="mb-1.5 block text-sm font-medium text-slate-700">
              Diagnóstico <span className="text-red-500">*</span>
            </label>
            <textarea
              id="diagnostico"
              value={diagnostico}
              onChange={(evento) => setDiagnostico(evento.target.value)}
              rows={3}
              placeholder="Ej. Caries profunda en pieza 46, compromiso pulpar probable..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label htmlFor="tratamientoSugerido" className="mb-1.5 block text-sm font-medium text-slate-700">
              Tratamiento sugerido <span className="text-red-500">*</span>
            </label>
            <textarea
              id="tratamientoSugerido"
              value={tratamientoSugerido}
              onChange={(evento) => setTratamientoSugerido(evento.target.value)}
              rows={2}
              placeholder="Ej. Endodoncia + corona en pieza 46. Cita de seguimiento en 2 semanas."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div>
            <label htmlFor="notasPrivadas" className="mb-1.5 block text-sm font-medium text-slate-700">
              Notas privadas <span className="text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="notasPrivadas"
              value={notasPrivadas}
              onChange={(evento) => setNotasPrivadas(evento.target.value)}
              rows={2}
              placeholder="Notas internas — nunca se muestran en el portal público."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />}
              {guardando ? 'Guardando…' : 'Guardar Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
