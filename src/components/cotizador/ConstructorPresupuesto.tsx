'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { calcularTotalPresupuesto, crearItemVacio, formatearMoneda, TRATAMIENTOS_SUGERIDOS } from '@/components/cotizador/tipos';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { ApiRespuesta, CrearPresupuestoInput, ItemPresupuesto, PresupuestoDetallado } from '@/types';

interface ConstructorPresupuestoProps {
  idPaciente: string;
  /** Se dispara tras un `POST` exitoso, con el presupuesto ya creado, para insertarlo en la lista sin recargar. */
  onGuardado: (presupuesto: PresupuestoDetallado) => void;
}

/**
 * Generador de presupuestos formal: el dentista agrega múltiples filas de
 * tratamientos, les asigna un costo en MXN y una cantidad, y ve el subtotal
 * y el total (con descuento) calculados en vivo. "Guardar Presupuesto" hace
 * `POST /api/presupuestos/crear`, que siempre crea el registro como
 * `'Borrador'` — el total real, autoritativo, siempre lo recalcula el
 * servidor (`calcularTotalPresupuesto` en `presupuestosRepository.ts`); este
 * componente solo usa su copia cliente-seguro (`components/cotizador/tipos.ts`)
 * para la vista previa mientras se captura.
 */
export function ConstructorPresupuesto({ idPaciente, onGuardado }: ConstructorPresupuestoProps) {
  const [items, setItems] = useState<ItemPresupuesto[]>([crearItemVacio()]);
  const [descuento, setDescuento] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((acumulado, item) => acumulado + item.costoUnitario * item.cantidad, 0),
    [items],
  );
  const total = useMemo(() => calcularTotalPresupuesto(items, descuento), [items, descuento]);

  function actualizarItem(indice: number, cambios: Partial<ItemPresupuesto>): void {
    setItems((actuales) => actuales.map((item, i) => (i === indice ? { ...item, ...cambios } : item)));
  }

  function agregarFila(): void {
    setItems((actuales) => [...actuales, crearItemVacio()]);
  }

  function quitarFila(indice: number): void {
    setItems((actuales) => (actuales.length <= 1 ? actuales : actuales.filter((_, i) => i !== indice)));
  }

  async function guardarPresupuesto(): Promise<void> {
    if (guardando) return;

    const itemsValidos = items.filter((item) => item.tratamiento.trim().length > 0);
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un tratamiento con nombre.');
      return;
    }
    if (itemsValidos.some((item) => item.costoUnitario <= 0)) {
      setError('Cada tratamiento debe tener un costo mayor a $0.00.');
      return;
    }
    if (itemsValidos.some((item) => item.cantidad <= 0)) {
      setError('Cada tratamiento debe tener una cantidad mayor a 0.');
      return;
    }
    if (descuento < 0) {
      setError('El descuento no puede ser negativo.');
      return;
    }

    const payload: CrearPresupuestoInput = {
      idPaciente,
      items: itemsValidos.map((item) => ({
        tratamiento: item.tratamiento.trim(),
        diente: item.diente.trim(),
        costoUnitario: item.costoUnitario,
        cantidad: item.cantidad,
      })),
      descuento,
    };

    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/presupuestos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<PresupuestoDetallado> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setError(cuerpo.error ?? 'Ocurrió un error inesperado al guardar el presupuesto. Intenta de nuevo.');
        setGuardando(false);
        return;
      }

      onGuardado(cuerpo.data);
      setItems([crearItemVacio()]);
      setDescuento(0);
      setMostrarToast(true);
      setTimeout(() => setMostrarToast(false), AUTO_CIERRE_TOAST_FLOTANTE_MS);
    } catch (err) {
      console.error('[ConstructorPresupuesto] Error de red guardando el presupuesto:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-800">Nuevo presupuesto</p>
        <p className="text-xs text-slate-400">Agrega los tratamientos, su costo en MXN y la cantidad de piezas.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="py-2 pr-3 font-semibold">Tratamiento</th>
              <th className="py-2 pr-3 font-semibold">Diente</th>
              <th className="py-2 pr-3 font-semibold">Costo unitario</th>
              <th className="py-2 pr-3 font-semibold">Cantidad</th>
              <th className="py-2 pr-3 font-semibold">Subtotal</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, indice) => (
              <tr key={indice}>
                <td className="py-2 pr-3">
                  <input
                    type="text"
                    list="tratamientos-sugeridos"
                    value={item.tratamiento}
                    onChange={(evento) => actualizarItem(indice, { tratamiento: evento.target.value })}
                    placeholder="Ej. Endodoncia"
                    className="w-full min-w-[140px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="text"
                    value={item.diente}
                    onChange={(evento) => actualizarItem(indice, { diente: evento.target.value })}
                    placeholder="16"
                    className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.costoUnitario === 0 ? '' : item.costoUnitario}
                    onChange={(evento) =>
                      actualizarItem(indice, { costoUnitario: Number.parseFloat(evento.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={item.cantidad}
                    onChange={(evento) =>
                      actualizarItem(indice, { cantidad: Math.max(1, Number.parseInt(evento.target.value, 10) || 1) })
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2 pr-3 font-medium text-slate-700">
                  {formatearMoneda(item.costoUnitario * item.cantidad)}
                </td>
                <td className="py-2 pr-1">
                  <button
                    type="button"
                    onClick={() => quitarFila(indice)}
                    disabled={items.length <= 1}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Quitar tratamiento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <datalist id="tratamientos-sugeridos">
          {TRATAMIENTOS_SUGERIDOS.map((sugerencia) => (
            <option key={sugerencia} value={sugerencia} />
          ))}
        </datalist>
      </div>

      <button
        type="button"
        onClick={agregarFila}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Agregar tratamiento
      </button>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="descuento" className="text-sm font-medium text-slate-700">
            Descuento (MXN)
          </label>
          <input
            id="descuento"
            type="number"
            min={0}
            step="0.01"
            value={descuento === 0 ? '' : descuento}
            onChange={(evento) => setDescuento(Number.parseFloat(evento.target.value) || 0)}
            placeholder="0.00"
            className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1 text-right">
          <p className="text-xs text-slate-400">Subtotal: {formatearMoneda(subtotal)}</p>
          <p className="text-lg font-bold text-slate-800">Total: {formatearMoneda(total)}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={guardarPresupuesto}
          disabled={guardando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {guardando ? 'Guardando…' : 'Guardar Presupuesto'}
        </button>
      </div>

      {mostrarToast && (
        <ToastFlotante
          tipo="exito"
          titulo="Presupuesto guardado"
          mensaje="El presupuesto se guardó como Borrador. Puedes pasarlo a Estado de Cuenta cuando el paciente lo acepte."
          onCerrar={() => setMostrarToast(false)}
        />
      )}
    </div>
  );
}
