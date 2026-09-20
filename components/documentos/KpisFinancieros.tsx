import { Banknote, Receipt, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatearMoneda, type ResumenFinanciero } from '@/components/documentos/tipos';

interface KpisFinancierosProps {
  resumen: ResumenFinanciero;
}

interface TarjetaKpi {
  etiqueta: string;
  valor: string;
  icono: LucideIcon;
  colorIcono: string;
  colorFondoIcono: string;
}

/**
 * 3 tarjetas ejecutivas del Cotizador de Presupuestos y Control de Abonos.
 * Es un componente de servidor (sin `'use client'`) a propósito: los 3
 * totales se calculan en `page.tsx` a partir del historial COMPLETO del
 * paciente leído de Google Sheets (`calcularResumenFinanciero`) — mismo
 * criterio que `KpisPacientes.tsx`.
 *
 * "Saldo Pendiente" cambia de color dinámicamente: rojo si el paciente aún
 * debe (> 0), esmeralda si está saldado o pagó de más (<= 0) — así el
 * dentista ve de un vistazo si hay que cobrar.
 */
export function KpisFinancieros({ resumen }: KpisFinancierosProps) {
  const saldoAlDia = resumen.saldoPendiente <= 0;

  const tarjetas: TarjetaKpi[] = [
    {
      etiqueta: 'Total Presupuestado',
      valor: formatearMoneda(resumen.totalPresupuestado),
      icono: Receipt,
      colorIcono: 'text-primary',
      colorFondoIcono: 'bg-primary/10',
    },
    {
      etiqueta: 'Total Abonado',
      valor: formatearMoneda(resumen.totalAbonado),
      icono: Banknote,
      colorIcono: 'text-emerald-600',
      colorFondoIcono: 'bg-emerald-50',
    },
    {
      etiqueta: 'Saldo Pendiente',
      valor: formatearMoneda(resumen.saldoPendiente),
      icono: Wallet,
      colorIcono: saldoAlDia ? 'text-emerald-600' : 'text-red-600',
      colorFondoIcono: saldoAlDia ? 'bg-emerald-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tarjetas.map((tarjeta) => {
        const Icono = tarjeta.icono;
        return (
          <div key={tarjeta.etiqueta} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{tarjeta.etiqueta}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tarjeta.colorFondoIcono}`}>
                <Icono className={`h-4 w-4 ${tarjeta.colorIcono}`} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">{tarjeta.valor}</p>
          </div>
        );
      })}
    </div>
  );
}
