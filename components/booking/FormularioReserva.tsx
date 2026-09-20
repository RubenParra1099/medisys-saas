'use client';

// TODO: formulario controlado (nombre, teléfono, correo, fecha, hora) que
// use el hook `useReservarCita` y muestre estados de éxito/409/error.
export function FormularioReserva({ idMedico }: { idMedico: string }) {
  return <form className="space-y-3" data-id-medico={idMedico} />;
}
