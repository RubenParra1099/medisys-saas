'use client';

// TODO: calendario visual que consume `useDisponibilidad` y resalta los
// horarios libres vs. ocupados para el id_medico + fecha seleccionados.
export function CalendarioDisponibilidad({ idMedico }: { idMedico: string }) {
  return <div data-id-medico={idMedico} />;
}
