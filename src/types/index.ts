/**
 * Tipos centrales del dominio.
 * Reflejan 1:1 las columnas de las pestañas "Medicos" y "Citas" de Google Sheets.
 */

export type PlanSuscripcion = 'basico' | 'premium' | 'pro';

export type EstatusPago = 'activo' | 'vencido' | 'pendiente' | 'cancelado';

export type EstatusCita = 'Pendiente' | 'Confirmada' | 'Cancelada';

export interface HorarioDia {
  activo: boolean;
  /** Formato "HH:mm", 24 horas. Ej: "09:00" */
  inicio: string;
  /** Formato "HH:mm", 24 horas. Ej: "18:00" */
  fin: string;
  duracionCitaMinutos: number;
}

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export type HorarioConfig = Record<DiaSemana, HorarioDia>;

/**
 * Representa una fila de la pestaña "Medicos".
 *
 * NOTA DE ARQUITECTURA: el esquema original solicitado no incluye correo de
 * contacto, cédula profesional, dirección física ni calificación del médico,
 * pero la interfaz del portal de reserva (perfil del médico) y el módulo de
 * notificaciones sí los necesitan. Se agregan como columnas opcionales — si
 * no existen en la hoja, la UI simplemente muestra un valor por defecto sin
 * romper el flujo (ver `DoctorProfileCard.tsx` y `notifications.ts`).
 */
export interface Medico {
  id_medico: string;
  nombre: string;
  especialidad: string;
  ciudad: string;
  precio_consulta: number;
  foto_url: string;
  plan_suscripcion: PlanSuscripcion;
  estatus_pago: EstatusPago;
  horario_config: HorarioConfig;
  /** Columna opcional recomendada (J) para notificaciones al médico. */
  correo_contacto?: string;
  /** Columna opcional recomendada (K). */
  cedula_profesional?: string;
  /** Columna opcional recomendada (L). Si no existe, se usa `ciudad` como fallback. */
  direccion?: string;
  /** Columna opcional recomendada (M), escala 0-5. Si no existe, la UI muestra 5.0. */
  calificacion?: number;
}

/** Representa una fila de la pestaña "Citas". */
export interface Cita {
  id_cita: string;
  id_medico: string;
  nombre_paciente: string;
  telefono_paciente: string;
  correo_paciente: string;
  /** Formato "YYYY-MM-DD" */
  fecha: string;
  /** Formato "HH:mm", 24 horas */
  hora: string;
  estatus: EstatusCita;
}

/** Payload que el cliente envía a POST /api/booking/crear-cita */
export interface CrearCitaInput {
  id_medico: string;
  nombre_paciente: string;
  telefono_paciente: string;
  correo_paciente: string;
  fecha: string;
  hora: string;
}

/** Forma estándar de respuesta de las API routes de este proyecto. */
export interface ApiRespuesta<T> {
  ok: boolean;
  error?: string;
  detalles?: string[];
  data?: T;
}
