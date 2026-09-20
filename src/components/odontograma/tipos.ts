/**
 * Tipos y catálogos compartidos del Módulo de Odontograma IA e Historial
 * Clínico.
 *
 * ALCANCE: por instrucción explícita, este módulo es 100% de datos de
 * PRUEBA/DEMOSTRACIÓN — el estado del odontograma vive únicamente en
 * `useState` dentro de `OdontogramaModule.tsx` (nada se lee ni se escribe en
 * Google Sheets desde aquí). Este archivo define exclusivamente la forma de
 * esos datos y los catálogos visuales (tratamientos, superficies, layout de
 * dentición) para que el resto de los componentes del módulo compartan un
 * único vocabulario tipado.
 */

// ---------------------------------------------------------------------------
// Superficies dentales
// ---------------------------------------------------------------------------

/**
 * Las 5 superficies clínicas estándar de una pieza dental en un odontograma:
 * - vestibular: cara externa (hacia labios/mejillas).
 * - lingual: cara interna (hacia la lengua/paladar — "linguopalatina").
 * - mesial: cara lateral hacia la línea media de la arcada.
 * - distal: cara lateral hacia atrás (opuesta a mesial).
 * - oclusal: cara de masticación (el cuadro central).
 */
export const SUPERFICIES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal'] as const;

export type Superficie = (typeof SUPERFICIES)[number];

export const ETIQUETAS_SUPERFICIE: Record<Superficie, string> = {
  vestibular: 'Vestibular',
  lingual: 'Lingual / Palatina',
  mesial: 'Mesial',
  distal: 'Distal',
  oclusal: 'Oclusal',
};

// ---------------------------------------------------------------------------
// Catálogo de tratamientos / diagnósticos (Leyenda)
// ---------------------------------------------------------------------------

/**
 * "sano" no aparece en la leyenda (no es un hallazgo clínico) pero es el
 * estado inicial de toda superficie — se necesita como valor de `TratamientoId`
 * para poder tipar `crearSuperficiesSanas()` de forma segura.
 */
export type TratamientoId = 'sano' | 'caries' | 'tratamiento_realizado' | 'corona_puente' | 'ausente';

export interface DefinicionTratamiento {
  id: TratamientoId;
  etiqueta: string;
  /** Color base (para texto, íconos, borde del botón activo de la leyenda). */
  colorTexto: string;
  /** Clase de fondo sólido — usada en el botón de la leyenda y en el punto de color. */
  colorFondoSolido: string;
  /** Clase de fondo suave — usada al pintar la superficie del diente afectada. */
  colorFondoSuave: string;
  /** Clase de borde — usada al pintar la superficie del diente afectada. */
  colorBorde: string;
  /** Valor hex del "fill" SVG suave, para las superficies (Tailwind arbitrary value). */
  fillSvg: string;
  /** Valor hex del "stroke" SVG, para el borde de la superficie afectada. */
  strokeSvg: string;
}

/**
 * Catálogo visual normalizado pedido explícitamente:
 * Caries = Rojo · Tratamiento Realizado = Azul · Corona/Puente = Verde ·
 * Ausente/Extracción = Gris (tachado).
 */
export const TRATAMIENTOS: DefinicionTratamiento[] = [
  {
    id: 'caries',
    etiqueta: 'Caries',
    colorTexto: 'text-red-600',
    colorFondoSolido: 'bg-red-500',
    colorFondoSuave: 'bg-red-50',
    colorBorde: 'border-red-500',
    fillSvg: '#fef2f2',
    strokeSvg: '#ef4444',
  },
  {
    id: 'tratamiento_realizado',
    etiqueta: 'Tratamiento Realizado',
    colorTexto: 'text-blue-600',
    colorFondoSolido: 'bg-blue-500',
    colorFondoSuave: 'bg-blue-50',
    colorBorde: 'border-blue-500',
    fillSvg: '#eff6ff',
    strokeSvg: '#3b82f6',
  },
  {
    id: 'corona_puente',
    etiqueta: 'Corona / Puente',
    colorTexto: 'text-emerald-600',
    colorFondoSolido: 'bg-emerald-500',
    colorFondoSuave: 'bg-emerald-50',
    colorBorde: 'border-emerald-500',
    fillSvg: '#ecfdf5',
    strokeSvg: '#10b981',
  },
  {
    id: 'ausente',
    etiqueta: 'Ausente / Extracción',
    colorTexto: 'text-slate-500',
    colorFondoSolido: 'bg-slate-400',
    colorFondoSuave: 'bg-slate-100',
    colorBorde: 'border-slate-400',
    fillSvg: '#f1f5f9',
    strokeSvg: '#94a3b8',
  },
];

/** Definición "sano" — no se muestra en la leyenda, pero completa el catálogo. */
export const TRATAMIENTO_SANO: DefinicionTratamiento = {
  id: 'sano',
  etiqueta: 'Sano',
  colorTexto: 'text-slate-400',
  colorFondoSolido: 'bg-white',
  colorFondoSuave: 'bg-white',
  colorBorde: 'border-slate-200',
  fillSvg: '#ffffff',
  strokeSvg: '#cbd5e1',
};

/** Busca la definición visual de un tratamiento; nunca falla gracias al fallback a "sano". */
export function obtenerDefinicionTratamiento(id: TratamientoId): DefinicionTratamiento {
  if (id === 'sano') return TRATAMIENTO_SANO;
  return TRATAMIENTOS.find((t) => t.id === id) ?? TRATAMIENTO_SANO;
}

// ---------------------------------------------------------------------------
// Estado del odontograma
// ---------------------------------------------------------------------------

/** Estado de las 5 superficies de UNA pieza dental. */
export type EstadoSuperficies = Record<Superficie, TratamientoId>;

/** Estado completo del odontograma de un paciente: número de pieza (FDI) → superficies. */
export type EstadoOdontograma = Record<number, EstadoSuperficies>;

/** Toda pieza nueva nace sana en sus 5 superficies. */
export function crearSuperficiesSanas(): EstadoSuperficies {
  return {
    vestibular: 'sano',
    lingual: 'sano',
    mesial: 'sano',
    distal: 'sano',
    oclusal: 'sano',
  };
}

// ---------------------------------------------------------------------------
// Layout de dentición (numeración FDI)
// ---------------------------------------------------------------------------

export type TipoDenticion = 'adulta' | 'infantil';

export interface FilaCuadrante {
  etiqueta: string;
  numeros: number[];
}

export interface LayoutDenticion {
  filaSuperior: FilaCuadrante[];
  filaInferior: FilaCuadrante[];
}

/**
 * Numeración FDI (ISO 3950):
 * - Dentición adulta (32 piezas): cuadrantes 1-4, piezas 11-18 / 21-28 / 31-38 / 41-48.
 * - Dentición infantil/decidua (20 piezas): cuadrantes 5-8, piezas 51-55 / 61-65 / 71-75 / 81-85.
 *
 * El orden visual respeta la convención clínica estándar: en la fila
 * superior el cuadrante 1 (derecho del paciente) va a la IZQUIERDA de la
 * pantalla y desciende de 18→11, y el cuadrante 2 a la derecha asciende de
 * 21→28 — así el odontograma se lee como si el observador estuviera frente
 * al paciente. La fila inferior es simétrica con los cuadrantes 4 y 3.
 */
export const LAYOUT_DENTICION: Record<TipoDenticion, LayoutDenticion> = {
  adulta: {
    filaSuperior: [
      { etiqueta: 'Cuadrante 1', numeros: [18, 17, 16, 15, 14, 13, 12, 11] },
      { etiqueta: 'Cuadrante 2', numeros: [21, 22, 23, 24, 25, 26, 27, 28] },
    ],
    filaInferior: [
      { etiqueta: 'Cuadrante 4', numeros: [48, 47, 46, 45, 44, 43, 42, 41] },
      { etiqueta: 'Cuadrante 3', numeros: [31, 32, 33, 34, 35, 36, 37, 38] },
    ],
  },
  infantil: {
    filaSuperior: [
      { etiqueta: 'Cuadrante 5', numeros: [55, 54, 53, 52, 51] },
      { etiqueta: 'Cuadrante 6', numeros: [61, 62, 63, 64, 65] },
    ],
    filaInferior: [
      { etiqueta: 'Cuadrante 8', numeros: [85, 84, 83, 82, 81] },
      { etiqueta: 'Cuadrante 7', numeros: [71, 72, 73, 74, 75] },
    ],
  },
};

export const ETIQUETAS_DENTICION: Record<TipoDenticion, string> = {
  adulta: 'Dentición Adulta (32 piezas)',
  infantil: 'Dentición Infantil (20 piezas)',
};

// ---------------------------------------------------------------------------
// Pacientes de demostración (buscador)
// ---------------------------------------------------------------------------

export interface PacienteDemo {
  id: string;
  nombre: string;
  edad: number;
  denticionSugerida: TipoDenticion;
}

/** Lista fija de pacientes de prueba — no proviene de Google Sheets. */
export const PACIENTES_DEMO: PacienteDemo[] = [
  { id: 'p1', nombre: 'María Fernanda López', edad: 34, denticionSugerida: 'adulta' },
  { id: 'p2', nombre: 'Carlos Alberto Ruiz', edad: 41, denticionSugerida: 'adulta' },
  { id: 'p3', nombre: 'Sofía Jiménez Ortega', edad: 7, denticionSugerida: 'infantil' },
  { id: 'p4', nombre: 'Diego Armando Torres', edad: 28, denticionSugerida: 'adulta' },
  { id: 'p5', nombre: 'Valentina Cruz Medina', edad: 9, denticionSugerida: 'infantil' },
];

// ---------------------------------------------------------------------------
// Historial de evolución (log textual de la sesión)
// ---------------------------------------------------------------------------

export interface HallazgoHistorial {
  id: string;
  numeroDiente: number;
  superficie: Superficie;
  tratamiento: TratamientoId;
  /** Hora local (HH:mm:ss) en que se registró, solo para mostrar en el log. */
  hora: string;
}
