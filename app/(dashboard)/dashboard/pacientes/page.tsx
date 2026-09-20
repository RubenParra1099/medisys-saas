import { redirect } from 'next/navigation';
import { KpisPacientes } from '@/components/pacientes/KpisPacientes';
import { TablaPacientes } from '@/components/pacientes/TablaPacientes';
import { listarPacientesPorMedico } from '@/utils/pacientesRepository';
import { obtenerIdMedicoSesion } from '@/utils/session';
import type { Paciente } from '@/types';

/**
 * Ruta `/dashboard/pacientes` — Listado real de pacientes registrados.
 *
 * Server component asíncrono: en cada carga lee en vivo la pestaña
 * "Pacientes" de Google Sheets (vía `listarPacientesPorMedico`, ya filtrada
 * de forma segura del lado del servidor por `id_medico` — nunca se manda al
 * cliente la hoja completa de pacientes de todos los médicos) y calcula los
 * 3 KPIs ejecutivos ANTES de pasarle el listado completo a
 * `<TablaPacientes />`, que es quien maneja el buscador en tiempo real y el
 * renderizado de la tabla en el cliente.
 *
 * `force-dynamic` es intencional: nunca queremos servir una versión en
 * caché de este listado — cada entrada debe reflejar el estado más
 * reciente de la hoja (por ejemplo, justo después de registrar a alguien
 * nuevo desde `/dashboard/pacientes/nuevo`).
 */
export const dynamic = 'force-dynamic';

/** "Nuevos este Mes" — compara el prefijo "YYYY-MM" de `fecha_registro` contra el mes actual. */
function contarNuevosEsteMes(pacientes: Paciente[]): number {
  const ahora = new Date();
  const prefijoMesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  return pacientes.filter((paciente) => paciente.fecha_registro.startsWith(prefijoMesActual)).length;
}

/**
 * "Pacientes con Alergias Críticas" — criterio literal pedido: cuenta
 * filas donde `antecedentes_medicos` NO está vacío (no distingue todavía
 * severidad real; ver `hallazgosClinicos.ts` para la clasificación visual
 * por palabras clave que sí se usa en la tabla).
 */
function contarConAntecedentes(pacientes: Paciente[]): number {
  return pacientes.filter((paciente) => paciente.antecedentes_medicos.trim().length > 0).length;
}

export default async function PacientesPage() {
  const idMedico = obtenerIdMedicoSesion();

  if (!idMedico) {
    redirect('/login');
  }

  const pacientes = await listarPacientesPorMedico(idMedico).catch((error) => {
    console.error('[PacientesPage] No se pudo leer la pestaña "Pacientes" de Google Sheets:', error);
    return [] as Paciente[];
  });

  const totalPacientes = pacientes.length;
  const nuevosEsteMes = contarNuevosEsteMes(pacientes);
  const conAntecedentes = contarConAntecedentes(pacientes);

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Listado de pacientes registrados, con su historial clínico y acceso directo a su odontograma.
        </p>
      </div>

      <KpisPacientes total={totalPacientes} nuevosEsteMes={nuevosEsteMes} conAntecedentes={conAntecedentes} />

      <TablaPacientes pacientesIniciales={pacientes} />
    </main>
  );
}
