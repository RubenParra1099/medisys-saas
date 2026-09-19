interface HeroBannerProps {
  nombre?: string;
  especialidad?: string;
}

/** Encabezado principal del portal de reserva público — tarjeta azul degradada. */
export function HeroBanner({ nombre, especialidad }: HeroBannerProps) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-blue-950 p-8 text-white shadow-sm sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Reserva en línea</p>
      <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
        Reserva tu cita con {nombre ?? 'nuestro especialista'}
      </h1>
      {especialidad && <p className="mt-1.5 text-sm text-white/80">{especialidad}</p>}
    </div>
  );
}
