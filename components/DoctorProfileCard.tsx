import { Banknote, Clock, IdCard, MapPin, Star } from 'lucide-react';
import type { Medico } from '@/types';
import { resumenHorarioSemanal } from '@/utils/horario';

interface DoctorProfileCardProps {
  medico: Medico | null;
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(valor);
}

function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
      {iniciales || '?'}
    </div>
  );
}

/** Tarjeta blanca con la información del médico — columna izquierda del portal de reserva. */
export function DoctorProfileCard({ medico }: DoctorProfileCardProps) {
  const calificacion = medico?.calificacion ?? 5;

  return (
    <aside className="h-fit rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
        {medico?.foto_url ? (
          // La URL de la foto viene de la hoja de cálculo (dominio arbitrario),
          // por eso se usa <img> normal en vez de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={medico.foto_url} alt={medico.nombre} className="h-full w-full object-cover" />
        ) : (
          <Iniciales nombre={medico?.nombre ?? '?'} />
        )}
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-800">{medico?.nombre ?? 'Médico no encontrado'}</h2>
      <p className="text-sm text-slate-500">{medico?.especialidad ?? '—'}</p>

      <div className="mt-2 flex items-center gap-1">
        <Star className="h-4 w-4 text-amber-400" fill="currentColor" strokeWidth={0} />
        <span className="text-sm font-semibold text-slate-700">{calificacion.toFixed(1)}</span>
      </div>

      <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
        <div className="flex items-start gap-2.5">
          <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-400">Cédula profesional</dt>
            <dd className="text-slate-700">{medico?.cedula_profesional ?? 'No registrada'}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-400">Dirección</dt>
            <dd className="text-slate-700">{medico?.direccion ?? medico?.ciudad ?? 'No especificada'}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-400">Horario de atención</dt>
            <dd className="text-slate-700">{resumenHorarioSemanal(medico?.horario_config)}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-400">Tarifa de consulta</dt>
            <dd className="font-semibold text-slate-800">{medico ? formatearMoneda(medico.precio_consulta) : '—'}</dd>
          </div>
        </div>
      </dl>
    </aside>
  );
}
