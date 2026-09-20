'use client';

import { useState } from 'react';
import { ClipboardPlus, FileText, Lock, Stethoscope } from 'lucide-react';
import { ModalNotaEvolucion } from '@/components/historial/ModalNotaEvolucion';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { RegistroHistorialClinico } from '@/types';

interface TimelineHistorialProps {
  idPaciente: string;
  registrosIniciales: RegistroHistorialClinico[];
}

/** Formatea "YYYY-MM-DD" a un texto legible en español, ej. "19 sep 2026". */
function formatearFecha(fecha: string): string {
  const partes = fecha.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return fecha;
  const [anio, mes, dia] = partes;
  const formateador = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return formateador.format(new Date(anio, mes - 1, dia));
}

/**
 * Mesa de notas médicas premium: Timeline con las consultas anteriores del
 * paciente (más reciente primero — el servidor ya las trae en ese orden) y
 * el botón "Agregar Nota de Evolución" que abre `ModalNotaEvolucion`.
 */
export function TimelineHistorial({ idPaciente, registrosIniciales }: TimelineHistorialProps) {
  const [registros, setRegistros] = useState<RegistroHistorialClinico[]>(registrosIniciales);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);

  function manejarGuardado(registro: RegistroHistorialClinico): void {
    setRegistros((actuales) => [registro, ...actuales]);
    setModalAbierto(false);
    setMostrarToast(true);
    setTimeout(() => setMostrarToast(false), AUTO_CIERRE_TOAST_FLOTANTE_MS);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Línea del tiempo</p>
          <p className="text-xs text-slate-400">
            {registros.length === 0
              ? 'Todavía no hay notas de evolución.'
              : `${registros.length} nota${registros.length === 1 ? '' : 's'} registrada${registros.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <ClipboardPlus className="h-4 w-4" />
          Agregar Nota de Evolución
        </button>
      </div>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </span>
          <p className="text-sm font-medium text-slate-700">Sin consultas registradas todavía.</p>
          <p className="max-w-sm text-xs text-slate-400">
            Usa &ldquo;Agregar Nota de Evolución&rdquo; para capturar la primera consulta de este paciente.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-6 border-l-2 border-slate-100 pl-6">
          {registros.map((registro) => (
            <li key={registro.id_historial} className="relative">
              <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary shadow" />

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Stethoscope className="h-3 w-3" />
                    {formatearFecha(registro.fecha)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{registro.id_historial}</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Motivo de consulta</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{registro.motivo_consulta}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnóstico</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{registro.diagnostico}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tratamiento sugerido</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{registro.tratamiento_sugerido}</p>
                  </div>
                  {registro.notas_privadas && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Lock className="h-3 w-3" />
                        Notas privadas
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-600">{registro.notas_privadas}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {modalAbierto && (
        <ModalNotaEvolucion
          idPaciente={idPaciente}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={manejarGuardado}
        />
      )}

      {mostrarToast && (
        <ToastFlotante
          tipo="exito"
          titulo="Nota guardada"
          mensaje="La nota de evolución se guardó correctamente en el expediente."
          onCerrar={() => setMostrarToast(false)}
        />
      )}
    </div>
  );
}
