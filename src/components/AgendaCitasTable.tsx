'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { ApiRespuesta, Cita, EstatusCita } from '@/types';

interface AgendaCitasTableProps {
  citasIniciales: Cita[];
}

const ESTILOS_BADGE: Record<EstatusCita, string> = {
  Pendiente: 'bg-amber-50 text-amber-600',
  Confirmada: 'bg-emerald-50 text-emerald-600',
  Cancelada: 'bg-red-50 text-red-600',
};

function formatearFechaHora(fecha: string, hora: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);
  const fechaTexto = fechaObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fechaTexto} · ${hora} hrs`;
}

/**
 * Tabla interactiva de citas del médico. Recibe el listado inicial (server
 * component) y gestiona las acciones de "Confirmar" / "Cancelar" contra
 * POST /api/dashboard/actualizar-estatus, con estado de carga por fila y
 * actualización optimista en memoria (sin recargar la página).
 */
export function AgendaCitasTable({ citasIniciales }: AgendaCitasTableProps) {
  const [citas, setCitas] = useState<Cita[]>(citasIniciales);
  const [idsEnProceso, setIdsEnProceso] = useState<Set<string>>(new Set());
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  async function actualizarEstatus(idCita: string, nuevoEstatus: EstatusCita) {
    setErrorGlobal(null);
    setIdsEnProceso((previo) => new Set(previo).add(idCita));

    try {
      const respuesta = await fetch('/api/dashboard/actualizar-estatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_cita: idCita, estatus: nuevoEstatus }),
      });

      const json: ApiRespuesta<Cita> = await respuesta.json();

      if (!respuesta.ok || !json.ok || !json.data) {
        setErrorGlobal(json.error ?? 'No fue posible actualizar la cita.');
        return;
      }

      const citaActualizada = json.data;
      setCitas((previo) => previo.map((cita) => (cita.id_cita === idCita ? citaActualizada : cita)));
    } catch (error) {
      console.error('[AgendaCitasTable] Error de red al actualizar la cita:', error);
      setErrorGlobal('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setIdsEnProceso((previo) => {
        const copia = new Set(previo);
        copia.delete(idCita);
        return copia;
      });
    }
  }

  if (citas.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Todavía no tienes citas agendadas.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      {errorGlobal && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{errorGlobal}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Paciente</th>
              <th className="px-6 py-3 font-medium">Teléfono</th>
              <th className="px-6 py-3 font-medium">Correo</th>
              <th className="px-6 py-3 font-medium">Horario</th>
              <th className="px-6 py-3 font-medium">Estatus</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {citas.map((cita) => {
              const enProceso = idsEnProceso.has(cita.id_cita);

              return (
                <tr key={cita.id_cita} className="transition hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{cita.nombre_paciente}</td>
                  <td className="px-6 py-3.5 text-slate-500">{cita.telefono_paciente}</td>
                  <td className="px-6 py-3.5 text-slate-500">{cita.correo_paciente}</td>
                  <td className="px-6 py-3.5 text-slate-600">{formatearFechaHora(cita.fecha, cita.hora)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS_BADGE[cita.estatus]}`}>
                      {cita.estatus}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {cita.estatus !== 'Pendiente' ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : enProceso ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => actualizarEstatus(cita.id_cita, 'Confirmada')}
                          title="Confirmar cita"
                          aria-label="Confirmar cita"
                          className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarEstatus(cita.id_cita, 'Cancelada')}
                          title="Cancelar cita"
                          aria-label="Cancelar cita"
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
