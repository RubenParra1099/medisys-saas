import { Banknote, CalendarClock, Hourglass } from 'lucide-react';
import type { ComponentType } from 'react';

interface ResumenAgendaCardsProps {
  totalCitasMes: number;
  citasPendientes: number;
  ingresosEstimadosMes: number;
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(valor);
}

interface Tarjeta {
  etiqueta: string;
  valor: string;
  icono: ComponentType<{ className?: string }>;
  acento: string;
  fondo: string;
}

/** Resumen ejecutivo (KPIs) en la parte superior de la Agenda Médica. */
export function ResumenAgendaCards({ totalCitasMes, citasPendientes, ingresosEstimadosMes }: ResumenAgendaCardsProps) {
  const tarjetas: Tarjeta[] = [
    {
      etiqueta: 'Total de Citas del Mes',
      valor: totalCitasMes.toString(),
      icono: CalendarClock,
      acento: 'text-primary',
      fondo: 'bg-primary/10',
    },
    {
      etiqueta: 'Citas Pendientes por Confirmar',
      valor: citasPendientes.toString(),
      icono: Hourglass,
      acento: 'text-amber-500',
      fondo: 'bg-amber-50',
    },
    {
      etiqueta: 'Ingresos Estimados del Mes',
      valor: formatearMoneda(ingresosEstimadosMes),
      icono: Banknote,
      acento: 'text-emerald-600',
      fondo: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tarjetas.map((tarjeta) => {
        const Icono = tarjeta.icono;
        return (
          <div key={tarjeta.etiqueta} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tarjeta.fondo}`}>
              <Icono className={`h-5 w-5 ${tarjeta.acento}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">{tarjeta.valor}</p>
            <p className="text-xs text-slate-500">{tarjeta.etiqueta}</p>
          </div>
        );
      })}
    </div>
  );
}
