import type { CrearCitaInput } from '@/types';

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Acepta +52..., 10 dígitos, con o sin espacios/guiones. Ajusta a tu mercado si lo requieres.
const REGEX_TELEFONO = /^\+?[0-9()\-\s]{10,20}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  data?: CrearCitaInput;
}

function esTextoNoVacio(valor: unknown, minLength = 2): valor is string {
  return typeof valor === 'string' && valor.trim().length >= minLength;
}

/**
 * Valida y sanitiza el body recibido en POST /api/booking/crear-cita.
 * No confía en el tipo del body entrante: llega como `unknown` desde `request.json()`.
 */
export function validarCrearCitaInput(body: unknown): ResultadoValidacion {
  const errores: string[] = [];

  if (typeof body !== 'object' || body === null) {
    return { valido: false, errores: ['El cuerpo de la solicitud debe ser un objeto JSON.'] };
  }

  const b = body as Record<string, unknown>;

  if (!esTextoNoVacio(b.id_medico, 1)) {
    errores.push('id_medico es requerido.');
  }
  if (!esTextoNoVacio(b.nombre_paciente, 2)) {
    errores.push('nombre_paciente es requerido (mínimo 2 caracteres).');
  }
  if (typeof b.telefono_paciente !== 'string' || !REGEX_TELEFONO.test(b.telefono_paciente.trim())) {
    errores.push('telefono_paciente no tiene un formato válido.');
  }
  if (typeof b.correo_paciente !== 'string' || !REGEX_CORREO.test(b.correo_paciente.trim())) {
    errores.push('correo_paciente no tiene un formato válido.');
  }
  if (typeof b.fecha !== 'string' || !REGEX_FECHA.test(b.fecha)) {
    errores.push('fecha debe tener el formato YYYY-MM-DD.');
  }
  if (typeof b.hora !== 'string' || !REGEX_HORA.test(b.hora)) {
    errores.push('hora debe tener el formato HH:mm (24 horas).');
  }

  // Validación de fecha/hora no pasada, solo si el formato ya es válido.
  if (errores.length === 0) {
    const fechaHora = new Date(`${b.fecha as string}T${b.hora as string}:00`);
    if (Number.isNaN(fechaHora.getTime()) || fechaHora.getTime() < Date.now() - 5 * 60 * 1000) {
      errores.push('No se pueden agendar citas en el pasado.');
    }
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  const data: CrearCitaInput = {
    id_medico: (b.id_medico as string).trim(),
    nombre_paciente: (b.nombre_paciente as string).trim(),
    telefono_paciente: (b.telefono_paciente as string).trim(),
    correo_paciente: (b.correo_paciente as string).trim().toLowerCase(),
    fecha: (b.fecha as string).trim(),
    hora: (b.hora as string).trim(),
  };

  return { valido: true, errores: [], data };
}
