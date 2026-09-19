import type { Medico } from '@/types';

// TODO: vista completa del perfil público (foto, bio, ciudad, precio, horario).
export function PerfilMedico({ medico }: { medico: Medico }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{medico.nombre}</h2>
      <p>{medico.especialidad} — {medico.ciudad}</p>
    </section>
  );
}
