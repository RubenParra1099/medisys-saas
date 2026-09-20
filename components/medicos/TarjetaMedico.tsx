import type { Medico } from '@/types';

// TODO: estilizar con Tailwind (foto, nombre, especialidad, precio, CTA "Agendar").
export function TarjetaMedico({ medico }: { medico: Medico }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="font-semibold">{medico.nombre}</p>
      <p className="text-sm text-gray-500">{medico.especialidad}</p>
    </div>
  );
}
