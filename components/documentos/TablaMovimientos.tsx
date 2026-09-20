'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CirclePlus, Landmark } from 'lucide-react';
import { ESTILOS_TIPO_MOVIMIENTO, formatearMoneda } from '@/components/documentos/tipos';
import { ModalMovimiento } from '@/components/documentos/ModalMovimiento';
import type { MovimientoFinanciero } from '@/types';

interface TablaMovimientosProps {
  idPaciente: string;
  /** Historial completo leído de Google Sheets por `page.tsx` (Server Component). */
  movimientos: MovimientoFinanciero[];
}

/**
 * Tabla premium del historial financiero del paciente + botón "Crear
 * Cotización / Registrar Abono" que abre `<ModalMovimiento />`. Es un
 * componente de cliente porque maneja el estado de apertura del modal y
 * refresca la página tras un `POST` exitoso.
 *
 * El refresh usa `router.refresh()` (no un `fetch` propio de la tabla) para
 * volver a ejecutar el Server Component de `documentos/page.tsx` — así los 3
 * KPIs y el historial completo se recalculan del lado del servidor con los
 * datos más recientes de Google Sheets, en vez de duplicar esa lógica de
 * cálculo en el cliente.
 */
export function TablaMovimientos({ idPaciente, movimientos }: TablaMovimientosProps) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);

  function manejarGuardado(): void {
    setModalAbierto(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Historial de Movimientos</h2>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <CirclePlus className="h-4 w-4" />
          Crear Cotización / Registrar Abono
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-semibold text-slate-500">Fecha</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Concepto</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Monto</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    <span className="inline-flex flex-col items-center gap-2">
                      <Landmark className="h-6 w-6 text-slate-300" />
                      Este paciente todavía no tiene cotizaciones ni abonos registrados.
                    </span>
                  </td>
                </tr>
              ) : (
                movimientos.map((movimiento) => (
                  <tr key={movimiento.id_transaccion} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 align-top text-slate-500">{movimiento.fecha}</td>
                    <td className="px-4 py-3.5 align-top font-medium text-slate-800">{movimiento.concepto}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_TIPO_MOVIMIENTO[movimiento.tipo]}`}
                      >
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-right font-semibold text-slate-800">
                      {formatearMoneda(movimiento.monto)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-slate-500">
                      {movimiento.notas || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <ModalMovimiento
          idPaciente={idPaciente}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={manejarGuardado}
        />
      )}
    </div>
  );
}
