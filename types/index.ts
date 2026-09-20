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
  /**
   * Columna opcional recomendada (P) — preferencias de recordatorios de
   * citas (ver "Recordatorios de Citas" abajo). Si no existe o está
   * corrupta, se usa `CONFIGURACION_RECORDATORIOS_POR_DEFECTO`
   * (`medicosRepository.ts`).
   *
   * ⚠️ NO es la columna N: las columnas N y O de "Medicos" están reservadas
   * para `usuario_login`/`password_hash` (ver `authRepository.ts`).
   */
  configuracion_recordatorios?: ConfiguracionRecordatorios;
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

/**
 * Horario general de atención del consultorio (independiente del
 * `HorarioConfig` día-por-día de "Medicos", que rige la agenda de citas).
 */
export interface HorasAtencion {
  /** Formato "HH:mm", 24 horas. Ej: "09:00" */
  horaApertura: string;
  /** Formato "HH:mm", 24 horas. Ej: "18:00" */
  horaCierre: string;
}

/**
 * Representa una fila de la pestaña "Consultorios" — configuración de "Mi
 * Consultorio" (ver `src/utils/consultorioRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_medico`, `nombre_clinica`, `telefono_comercial`, `direccion_fisica`,
 * `dias_atencion`, `horas_atencion_json`.
 *
 * Es una relación 1 a 1 con "Medicos" (una fila por `id_medico`) — a
 * diferencia de "Citas"/"Pacientes"/"Saldos", que son append-only, esta
 * pestaña se actualiza (upsert) en el lugar: `guardarConsultorio` sobrescribe
 * la fila existente del médico en vez de agregar una nueva cada vez que
 * guarda el formulario.
 */
export interface ConfiguracionConsultorio {
  id_medico: string;
  nombre_clinica: string;
  telefono_comercial: string;
  direccion_fisica: string;
  /** Se guarda en la hoja como texto separado por comas, ej. "lunes,martes,miercoles". */
  dias_atencion: DiaSemana[];
  /** Se guarda en la hoja como `HorasAtencion` serializado con `JSON.stringify`. */
  horas_atencion: HorasAtencion;
}

/** Payload que el formulario "Mi Consultorio" envía a `POST /api/consultorio/guardar`. */
export interface GuardarConsultorioInput {
  nombreClinica: string;
  telefonoComercial: string;
  direccionFisica: string;
  diasAtencion: DiaSemana[];
  horaApertura: string;
  horaCierre: string;
}

/** Rol de un usuario invitado al sistema — nunca es el médico principal (dueño de la sesión). */
export type RolUsuarioAutorizado = 'Asistente' | 'Socio';

/**
 * Representa una fila de la pestaña "Usuarios_Autorizados" — invitados con
 * acceso al sistema (ver `src/utils/usuariosAutorizadosRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_autorizacion`, `id_medico_principal`, `correo_invitado`, `rol`.
 */
export interface UsuarioAutorizado {
  /** Formato "INV-12345" (ver `generarIdAutorizacionUnico` en `usuariosAutorizadosRepository.ts`). */
  id_autorizacion: string;
  id_medico_principal: string;
  correo_invitado: string;
  rol: RolUsuarioAutorizado;
}

/** Payload que el modal "Invitar Usuario" envía a `POST /api/usuarios-autorizados/invitar`. */
export interface InvitarUsuarioInput {
  correoInvitado: string;
  rol: RolUsuarioAutorizado;
}

/**
 * Preferencias de recordatorios automáticos de citas — se guarda como una
 * sola columna JSON (`configuracion_recordatorios_json`, columna **P**
 * opcional de "Medicos" — nunca N/O, reservadas para las credenciales de
 * login) en vez de una columna booleana por interruptor, siguiendo el mismo
 * criterio ya usado para `horario_config`: agregar un nuevo recordatorio en
 * el futuro (ej. "1 semana antes") no requiere una migración de columnas.
 */
export interface ConfiguracionRecordatorios {
  recordatorio24hActivo: boolean;
  recordatorio2hActivo: boolean;
  /** Interruptor maestro — si está apagado, no se envía ningún recordatorio sin importar los otros dos. */
  alertasAutomaticasActivas: boolean;
}

/** Payload que la mesa de control envía a `POST /api/recordatorios/actualizar`. */
export type ActualizarRecordatoriosInput = ConfiguracionRecordatorios;

/**
 * Representa una fila de la pestaña "Historiales_Clinicos" — vista
 * "Historial Clínico" (ver `src/utils/historialClinicoRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_historial`, `id_paciente`, `id_medico`, `fecha`, `motivo_consulta`,
 * `diagnostico`, `tratamiento_sugerido`, `notas_privadas`.
 *
 * Es append-only, como "Pacientes"/"Saldos" — cada nota de evolución es una
 * fila nueva; nunca se edita una fila existente.
 */
export interface RegistroHistorialClinico {
  /** Formato "HIST-12345" (ver `generarIdHistorialUnico` en `historialClinicoRepository.ts`). */
  id_historial: string;
  id_paciente: string;
  id_medico: string;
  /** Formato "YYYY-MM-DD". */
  fecha: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento_sugerido: string;
  /** Notas internas del médico — nunca se muestran en el portal público ni al paciente. */
  notas_privadas: string;
}

/** Payload que el formulario "Agregar Nota de Evolución" envía a `POST /api/historial/crear`. */
export interface CrearRegistroHistorialInput {
  idPaciente: string;
  motivoConsulta: string;
  diagnostico: string;
  tratamientoSugerido: string;
  notasPrivadas: string;
}

/** Una fila de la tabla de tratamientos dentro de un presupuesto (columna `items_json` serializada). */
export interface ItemPresupuesto {
  tratamiento: string;
  /** Pieza dental afectada (notación FDI, ej. "16") — puede venir vacío si el tratamiento no aplica a un diente específico. */
  diente: string;
  costoUnitario: number;
  cantidad: number;
}

/** Un presupuesto en 'Borrador' todavía se puede editar/descartar; 'Aceptado' ya generó su cargo en "Saldos" y es definitivo. */
export type EstatusPresupuesto = 'Borrador' | 'Aceptado';

/**
 * Representa una fila de la pestaña "Presupuestos_Detallados" — vista
 * "Cotizador de Presupuestos" (ver `src/utils/presupuestosRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_presupuesto`, `id_paciente`, `id_medico`, `fecha`, `items_json`,
 * `descuento`, `total_mxn`, `estatus`.
 *
 * `total_mxn` SIEMPRE se calcula del lado del servidor a partir de `items` y
 * `descuento` (`calcularTotalPresupuesto` en `components/cotizador/tipos.ts`)
 * — nunca se confía en un total que mandara el cliente.
 */
export interface PresupuestoDetallado {
  /** Formato "PRE-12345" (ver `generarIdPresupuestoUnico` en `presupuestosRepository.ts`). */
  id_presupuesto: string;
  id_paciente: string;
  id_medico: string;
  /** Formato "YYYY-MM-DD". */
  fecha: string;
  items: ItemPresupuesto[];
  /** Descuento en MXN (monto fijo, no porcentaje) aplicado sobre el subtotal. */
  descuento: number;
  total_mxn: number;
  estatus: EstatusPresupuesto;
}

/** Payload que el constructor de presupuestos envía a `POST /api/presupuestos/crear`. Siempre se crea como 'Borrador'. */
export interface CrearPresupuestoInput {
  idPaciente: string;
  items: ItemPresupuesto[];
  descuento: number;
}

/** Payload que el botón "Pasar a Estado de Cuenta" envía a `POST /api/presupuestos/pasar-a-cuenta`. */
export interface PasarPresupuestoACuentaInput {
  idPresupuesto: string;
}

/** Tipo de archivo clínico — determina el ícono/badge en la Galería. */
export type TipoArchivoGaleria = 'Radiografia' | 'Fotografia';

/**
 * Representa una fila de la pestaña "Galeria_Clinica" — vista "Galería
 * Clínica" (ver `src/utils/galeriaRepository.ts`).
 *
 * Encabezados esperados en la Fila 1 de esa pestaña, en este orden exacto:
 * `id_foto`, `id_paciente`, `fecha`, `descripcion`, `imagen_url`,
 * `tipo_archivo`.
 *
 * A propósito NO tiene columna `id_medico` (así se pidió) — el acceso queda
 * acotado porque solo se llega aquí a través de un `id_paciente` que ya
 * resolvió `obtenerPacientePorId`, cuya lectura sí está scoped por médico en
 * el resto de la app.
 */
export interface FotoGaleria {
  /** Formato "IMG-12345" (ver `generarIdFotoUnico` en `galeriaRepository.ts`). */
  id_foto: string;
  id_paciente: string;
  /** Formato "YYYY-MM-DD". */
  fecha: string;
  descripcion: string;
  /**
   * URL de la imagen. Como todavía no existe infraestructura real de carga
   * de archivos, `POST /api/galeria/subir` genera una URL de PLACEHOLDER
   * determinística (`https://picsum.photos/seed/<id_foto>/...`) en vez de
   * subir un archivo real — tal como se pidió ("simule la carga... capture
   * una URL de prueba").
   */
  imagen_url: string;
  tipo_archivo: TipoArchivoGaleria;
}

/** Payload que el modal "Subir Imagen" envía a `POST /api/galeria/subir`. */
export interface SubirFotoGaleriaInput {
  idPaciente: string;
  descripcion: string;
  tipoArchivo: TipoArchivoGaleria;
}
