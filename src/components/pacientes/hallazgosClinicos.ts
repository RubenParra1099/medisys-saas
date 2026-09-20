/**
 * Clasificación visual de "Alergias / Condiciones" para la tabla de
 * pacientes, a partir de la columna `antecedentes_medicos` de la pestaña
 * "Pacientes".
 *
 * NOTA IMPORTANTE SOBRE EL DATO DE ORIGEN: hoy `antecedentes_medicos` es un
 * solo campo de texto libre (el textarea de `FormularioNuevoPaciente.tsx`),
 * no una lista de selectores estructurados — el dentista escribe algo como
 * "Alergia a la penicilina, hipertensión controlada". Por eso este archivo
 * SEPARA ese texto por los delimitadores más comunes al escribir una lista
 * a mano (coma, punto y coma, o " y ") y clasifica cada fragmento resultante
 * por coincidencia de palabras clave — es una heurística de presentación,
 * no un catálogo clínico cerrado. Si en el futuro el formulario captura
 * alergias/condiciones como selectores reales (cada uno con su propio id),
 * esta clasificación por palabras clave deja de ser necesaria: se podría
 * guardar la severidad directamente en cada selector.
 */

export type SeveridadHallazgo = 'alergia' | 'condicion' | 'otro';

/** Palabras clave de alergias (medicamentos, alimentos, materiales) — se pintan en rojo. */
const PALABRAS_ALERGIA = [
  'penicilina',
  'aines',
  'ibuprofeno',
  'aspirina',
  'sulfa',
  'sulfas',
  'latex',
  'mariscos',
  'nueces',
  'cacahuate',
  'cacahuates',
  'polen',
  'lidocaina',
  'yodo',
  'anestesia',
  'alergia',
  'alergico',
  'alergica',
];

/** Palabras clave de condiciones/enfermedades crónicas — se pintan en amarillo. */
const PALABRAS_CONDICION = [
  'hipertension',
  'diabetes',
  'asma',
  'epilepsia',
  'cardiopatia',
  'embarazo',
  'anticoagulante',
  'anticoagulantes',
  'vih',
  'hepatitis',
  'tiroides',
  'anemia',
  'marcapasos',
];

/** Quita acentos para poder comparar sin depender de que la tilde se haya escrito igual en ambos lados. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function clasificarHallazgo(texto: string): SeveridadHallazgo {
  const normalizado = normalizar(texto);
  if (PALABRAS_ALERGIA.some((palabra) => normalizado.includes(palabra))) return 'alergia';
  if (PALABRAS_CONDICION.some((palabra) => normalizado.includes(palabra))) return 'condicion';
  return 'otro';
}

function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Separa el texto libre de `antecedentes_medicos` en hallazgos individuales
 * para mostrar cada uno como su propio badge. Devuelve `[]` si el campo
 * viene vacío (el paciente no tiene antecedentes registrados).
 */
export function separarHallazgos(antecedentesMedicos: string): string[] {
  return antecedentesMedicos
    .split(/\s*(?:,|;|\sy\s)\s*/i)
    .map((fragmento) => capitalizar(fragmento.trim()))
    .filter((fragmento) => fragmento.length > 0);
}

/** Clases Tailwind por severidad — fondo suave + texto + borde sutil, consistente con los badges del odontograma. */
export const ESTILOS_SEVERIDAD: Record<SeveridadHallazgo, string> = {
  alergia: 'border border-red-100 bg-red-50 text-red-600',
  condicion: 'border border-amber-100 bg-amber-50 text-amber-700',
  otro: 'border border-slate-200 bg-slate-100 text-slate-600',
};
