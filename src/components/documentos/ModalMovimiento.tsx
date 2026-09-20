'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Banknote, ClipboardList, Loader2, Receipt, X } from 'lucide-react';
import type { ApiRespuesta, CrearMovimientoFinancieroInput, TipoMovimientoFinanciero } from '@/types';

interface ModalMovimientoProps {
  /** El paciente sobre el que se está registrando el movimiento — nunca editable desde el modal. */
  idPaciente: string;
  onCerrar: () => void;
  /** Se dispara tras un `POST` exitoso, para que la página recargue el historial y los KPIs. */
  onGuardado: () => void;
}

interface ErroresFormulario {
  concepto?: string;
  monto?: string;
}

/**
 * Modal "Crear Cotización / Registrar Abono" — captura un nuevo movimiento
 * financiero (cargo por tratamiento o abono en efectivo/tarjeta) a dos
 * columnas y lo inserta de forma asíncrona vía `POST /api/saldos/crear`.
 *
 * `idPaciente` viene fijo del contexto de la página (`documentos/page.tsx`)
 * y nunca es editable aquí — el mismo criterio de seguridad que
 * `FormularioNuevoPaciente.tsx` aplica también del lado del servidor:
 * `id_medico` se resuelve SIEMPRE de la sesión, nunca de este formulario.
 */
export function ModalMovimiento({ idPaciente, onCerrar, onGuardado }: ModalMovimientoProps) {
  const [tipo, setTipo] = useState<TipoMovimientoFinanciero>('Presupuesto');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');

  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function validar(): ErroresFormulario {
    const nuevosErrores: ErroresFormulario = {};

    if (concepto.trim().length < 2) {
      nuevosErrores.concepto = 'Escribe un concepto (ej. "Endodoncia", "Abono en efectivo").';
    }

    const montoNumerico = Number.parseFloat(monto);
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      nuevosErrores.monto = 'Escribe un monto numérico mayor a 0.';
    }

    return nuevosErrores;
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (guardando) return;

    const erroresEncontrados = validar();
    setErrores(erroresEncontrados);
    setErrorGeneral(null);

    if (Object.keys(erroresEncontrados).length > 0) return;

    const payload: CrearMovimientoFinancieroInput = {
      idPaciente,
      concepto: concepto.trim(),
      tipo,
      monto: Number.parseFloat(monto),
      notas: notas.trim(),
    };

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/saldos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<{ idTransaccion: string }> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setErrorGeneral(cuerpo.error ?? 'Ocurrió un error inesperado al registrar el movimiento. Intenta de nuevo.');
        setGuardando(false);
        return;
      }

      onGuardado();
    } catch (error) {
      console.error('[ModalMovimiento] Error de red registrando el movimiento:', error);
      setErrorGeneral('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Crear Cotización / Registrar Abono</h2>
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

        <form onSubmit={manejarEnvio} className="p-6" noValidate>
          {/* Fila 1: selector Presupuesto / Abono, ancho completo */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Tipo de movimiento</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('Presupuesto')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  tipo === 'Presupuesto'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <Receipt className="h-4 w-4" />
                Cargo por Tratamiento
              </button>

              <button
                type="button"
                onClick={() => setTipo('Abono')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  tipo === 'Abono'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <Banknote className="h-4 w-4" />
                Abono en Efectivo/Tarjeta
              </button>
            </div>
          </div>

          {/* Fila 2: Concepto | Monto, a dos columnas */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label htmlFor="concepto" className="mb-1.5 block text-sm font-medium text-slate-700">
                Concepto <span className="text-red-500">*</span>
              </label>
              <div
                className={[
                  'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                  errores.concepto ? 'border-red-300' : 'border-slate-200',
                ].join(' ')}
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  id="concepto"
                  type="text"
                  value={concepto}
                  onChange={(evento) => setConcepto(evento.target.value)}
                  placeholder={tipo === 'Abono' ? 'Ej. Abono en efectivo' : 'Ej. Endodoncia, Resina...'}
                  className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {errores.concepto && <p className="mt-1.5 text-xs text-red-500">{errores.concepto}</p>}
            </div>

            <div>
              <label htmlFor="monto" className="mb-1.5 block text-sm font-medium text-slate-700">
                Monto (MXN) <span className="text-red-500">*</span>
              </label>
              <div
                className={[
                  'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                  errores.monto ? 'border-red-300' : 'border-slate-200',
                ].join(' ')}
              >
                <span className="shrink-0 text-sm text-slate-400">$</span>
                <input
                  id="monto"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={monto}
                  onChange={(evento) => setMonto(evento.target.value)}
                  placeholder="0.00"
                  className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {errores.monto && <p className="mt-1.5 text-xs text-red-500">{errores.monto}</p>}
            </div>

            {/* Fila 3: Notas, ancho completo */}
            <div className="sm:col-span-2">
              <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-slate-700">
                Notas
              </label>
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                  placeholder="Detalles adicionales del movimiento (opcional)"
                  rows={2}
                  className="w-full flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {errorGeneral && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorGeneral}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
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
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              {guardando ? 'Guardando…' : tipo === 'Abono' ? 'Registrar Abono' : 'Crear Cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
