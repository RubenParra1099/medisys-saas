import { AlertTriangle, UserPlus2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpisPacientesProps {
  total: number;
  nuevosEsteMes: number;
  conAntecedentes: number;
}

interface TarjetaKpi {
  etiqueta: string;
  valor: number;
  icono: LucideIcon;
  colorIcono: string;
  colorFondoIcono: string;
}

/**
 * 3 tarjetas ejecutivas del listado de pacientes. Es un componente de
 * servidor (sin `'use client'`) a propósito: los 3 números se calculan en
 * `page.tsx` a partir del listado COMPLETO leído de Google Sheets — no se
 * recalculan con el filtro de búsqueda de `TablaPacientes.tsx`, para que
 * siempre reflejen los totales reales, no los del resultado filtrado.
 */
export function KpisPacientes({ total, nuevosEsteMes, conAntecedentes }: KpisPacientesProps) {
  const tarjetas: TarjetaKpi[] = [
    {
      etiqueta: 'Total de Pacientes',
      valor: total,
      icono: Users,
      colorIcono: 'text-primary',
      colorFondoIcono: 'bg-primary/10',
    },
    {
      etiqueta: 'Nuevos este Mes',
      valor: nuevosEsteMes,
      icono: UserPlus2,
      colorIcono: 'text-emerald-600',
      colorFondoIcono: 'bg-emerald-50',
    },
    {
      etiqueta: 'Pacientes con Alergias Críticas',
      valor: conAntecedentes,
      icono: AlertTriangle,
      colorIcono: 'text-red-600',
      colorFondoIcono: 'bg-red-50',
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
