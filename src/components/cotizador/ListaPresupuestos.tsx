'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { ESTILOS_ESTATUS_PRESUPUESTO, formatearMoneda } from '@/components/cotizador/tipos';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { ApiRespuesta, PasarPresupuestoACuentaInput, PresupuestoDetallado } from '@/types';

interface ListaPresupuestosProps {
  presupuestos: PresupuestoDetallado[];
  /** Se dispara tras pasar un presupuesto a Estado de Cuenta, para que el componente padre actualice la lista maestra. */
  onActualizado: (presupuesto: PresupuestoDetallado) => void;
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
 * Lista de presupuestos ya guardados de un paciente (más reciente primero —
 * el servidor ya los trae en ese orden), con su badge Borrador/Aceptado y el
 * botón "Pasar a Estado de Cuenta" para los que todavía están en Borrador.
 * Ese botón hace `POST /api/presupuestos/pasar-a-cuenta`, que inserta el
 * cargo en "Saldos" (Documentos & Saldos) y marca el presupuesto como
 * Aceptado — de ahí en adelante el botón desaparece para ese presupuesto
 * (idempotencia también reforzada del lado del servidor con un 409).
 */
export function ListaPresupuestos({ presupuestos, onActualizado }: ListaPresupuestosProps) {
  const router = useRouter();
  const [idProcesando, setIdProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function pasarAEstadoDeCuenta(idPresupuesto: string): Promise<void> {
    if (idProcesando) return;

    const payload: PasarPresupuestoACuentaInput = { idPresupuesto };

    setIdProcesando(idPresupuesto);
    setError(null);
    try {
      const respuesta = await fetch('/api/presupuestos/pasar-a-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<PresupuestoDetallado> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setError(cuerpo.error ?? 'Ocurrió un error inesperado al pasar el presupuesto a Estado de Cuenta.');
        setIdProcesando(null);
        return;
      }

      onActualizado(cuerpo.data);
      setToast('El total se envió a Documentos & Saldos correctamente.');
      setTimeout(() => setToast(null), AUTO_CIERRE_TOAST_FLOTANTE_MS);
      router.refresh();
    } catch (err) {
      console.error('[ListaPresupuestos] Error de red al pasar a Estado de Cuenta:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIdProcesando(null);
    }
  }

  if (presupuestos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </span>
        <p className="text-sm font-medium text-slate-700">Sin presupuestos guardados todavía.</p>
        <p className="max-w-sm text-xs text-slate-400">Arma un presupuesto arriba y guárdalo para verlo aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">Presupuestos guardados</p>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-3">
        {presupuestos.map((presupuesto) => (
          <div key={presupuesto.id_presupuesto} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">{presupuesto.id_presupuesto}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{formatearFecha(presupuesto.fecha)}</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS_ESTATUS_PRESUPUESTO[presupuesto.estatus]}`}
              >
                {presupuesto.estatus}
              </span>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {presupuesto.items.map((item, indice) => (
                <li key={indice} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {item.tratamiento}
                    {item.diente ? ` (pieza ${item.diente})` : ''} × {item.cantidad}
                  </span>
                  <span className="shrink-0 font-medium text-slate-700">
                    {formatearMoneda(item.costoUnitario * item.cantidad)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-3">
              <div className="text-xs text-slate-400">
                {presupuesto.descuento > 0 && <span>Descuento: {formatearMoneda(presupuesto.descuento)} · </span>}
                Total: <span className="font-semibold text-slate-700">{formatearMoneda(presupuesto.total_mxn)}</span>
              </div>

              {presupuesto.estatus === 'Borrador' && (
                <button
                  type="button"
                  onClick={() => pasarAEstadoDeCuenta(presupuesto.id_presupuesto)}
                  disabled={idProcesando === presupuesto.id_presupuesto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {idProcesando === presupuesto.id_presupuesto ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRightCircle className="h-3.5 w-3.5" />
                  )}
                  Pasar a Estado de Cuenta
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <ToastFlotante tipo="exito" titulo="Listo" mensaje={toast} onCerrar={() => setToast(null)} />
      )}
    </div>
  );
}
