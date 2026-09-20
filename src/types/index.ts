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

/**
 * Credenciales de login de un médico, leídas por `authRepository.ts` desde
 * las columnas N/O (o K/L como compatibilidad temporal) de "Medicos".
 *
 * Vive como tipo independiente de `Medico` a propósito: `password_hash`
 * nunca debe viajar junto con el resto de los datos del médico que sí se
 * pasan a componentes de UI (dashboard, portal público) — mezclarlo en el
 * tipo `Medico` sería fácil de filtrar por accidente a un componente de
 * cliente. `authRepository.ts` es el único archivo que produce este tipo.
 */
export interface CredencialMedico {
  id_medico: string;
  usuario_login: string;
  password_hash: string;
}

/**
 * Representa una fila de la pestaña "Odontogramas" (persistencia real del
 * Módulo de Odontograma IA — ver `src/utils/odontogramaRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_odontograma`, `id_paciente`, `id_medico`, `fecha`, `datos_dentales`,
 * `notas_evolucion`.
 *
 * `datos_dentales` guarda el `EstadoOdontograma` completo (ver
 * `src/components/odontograma/tipos.ts`) serializado con `JSON.stringify` —
 * este tipo lo modela ya como texto crudo; el parseo/saneamiento (`JSON.parse`
 * + `sanearEstadoOdontograma`) ocurre en el repositorio, nunca en la UI.
 */
export interface RegistroOdontograma {
  id_odontograma: string;
  id_paciente: string;
  id_medico: string;
  /** Formato "YYYY-MM-DD". */
  fecha: string;
  /** `EstadoOdontograma` serializado con `JSON.stringify`. */
  datos_dentales: string;
  notas_evolucion: string;
}

/**
 * Representa una fila de la pestaña "Pacientes" (Captura de Pacientes
 * Nuevos — ver `src/utils/pacientesRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_paciente`, `id_medico`, `nombre_completo`, `telefono`, `correo`,
 * `fecha_nacimiento`, `antecedentes_medicos`, `fecha_registro`.
 */
export interface Paciente {
  /** Formato "PAC-12345" (ver `generarIdPacienteUnico` en `pacientesRepository.ts`). */
  id_paciente: string;
  id_medico: string;
  nombre_completo: string;
  telefono: string;
  /** Puede venir vacío — no todo paciente proporciona correo. */
  correo: string;
  /** Formato "YYYY-MM-DD". */
  fecha_nacimiento: string;
  /** Alergias/enfermedades relevantes. Puede venir vacío. */
  antecedentes_medicos: string;
  /** Formato "YYYY-MM-DD" — fecha en que se dio de alta el registro. */
  fecha_registro: string;
}

/** Payload que el formulario de captura envía a `POST /api/pacientes/crear`. */
export interface CrearPacienteInput {
  nombreCompleto: string;
  telefono: string;
  correo: string;
  /** Formato "YYYY-MM-DD". */
  fechaNacimiento: string;
  antecedentesMedicos: string;
}

/**
 * Un movimiento financiero solo puede ser uno de estos dos tipos: un cargo
 * por tratamiento presupuestado, o un abono (pago) recibido del paciente.
 */
export type TipoMovimientoFinanciero = 'Presupuesto' | 'Abono';

/**
 * Representa una fila de la pestaña "Saldos" (Cotizador de Presupuestos y
 * Control de Abonos — ver `src/utils/saldosRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_transaccion`, `id_paciente`, `id_medico`, `fecha`, `concepto`, `tipo`,
 * `monto`, `notas`.
 */
export interface MovimientoFinanciero {
  /** Formato "TX-12345" (ver `generarIdTransaccionUnico` en `saldosRepository.ts`). */
  id_transaccion: string;
  id_paciente: string;
  id_medico: string;
  /** Formato "YYYY-MM-DD". */
  fecha: string;
  /** Ej. "Endodoncia", "Resina", "Abono en efectivo". */
  concepto: string;
  tipo: TipoMovimientoFinanciero;
  /** Siempre positivo — el signo con el que se resta o suma al saldo lo decide `tipo`, no el número. */
  monto: number;
  /** Puede venir vacío. */
  notas: string;
}

/** Payload que el modal de captura envía a `POST /api/saldos/crear`. */
export interface CrearMovimientoFinancieroInput {
  idPaciente: string;
  concepto: string;
  tipo: TipoMovimientoFinanciero;
  monto: number;
  notas: string;
}
