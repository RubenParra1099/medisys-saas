'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConstructorPresupuesto } from '@/components/cotizador/ConstructorPresupuesto';
import { ListaPresupuestos } from '@/components/cotizador/ListaPresupuestos';
import type { PresupuestoDetallado } from '@/types';

interface PanelCotizadorProps {
  idPaciente: string;
  presupuestosIniciales: PresupuestoDetallado[];
}

/**
 * Envoltorio de cliente que une `ConstructorPresupuesto` (formulario) y
 * `ListaPresupuestos` (resultado) bajo un solo estado maestro de la lista de
 * presupuestos del paciente.
 *
 * Existe porque `cotizador/page.tsx` es un Server Component: no puede pasar
 * funciones (`onGuardado`/`onActualizado`) directamente a esos dos
 * Client Components hermanos — eso rompería el límite Server/Client de RSC
 * ("Functions cannot be passed directly to Client Components"). Este
 * componente de cliente sí puede recibir los datos serializables
 * (`idPaciente`, `presupuestosIniciales`) desde el servidor y coordinar
 * ambos hijos con callbacks normales de React.
 */
export function PanelCotizador({ idPaciente, presupuestosIniciales }: PanelCotizadorProps) {
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<PresupuestoDetallado[]>(presupuestosIniciales);

  function manejarGuardado(nuevo: PresupuestoDetallado): void {
    setPresupuestos((actuales) => [nuevo, ...actuales]);
    router.refresh();
  }

  function manejarActualizado(actualizado: PresupuestoDetallado): void {
    // `ListaPresupuestos` ya llama a `router.refresh()` tras esta actualización.
    setPresupuestos((actuales) =>
      actuales.map((presupuesto) => (presupuesto.id_presupuesto === actualizado.id_presupuesto ? actualizado : presupuesto)),
    );
  }

  return (
    <div className="space-y-6">
      <ConstructorPresupuesto idPaciente={idPaciente} onGuardado={manejarGuardado} />
      <ListaPresupuestos presupuestos={presupuestos} onActualizado={manejarActualizado} />
    </div>
  );
}
