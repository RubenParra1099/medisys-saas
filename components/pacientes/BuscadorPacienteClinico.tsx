'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';
import type { Paciente } from '@/types';

interface BuscadorPacienteClinicoProps {
  pacientes: Paciente[];
  idPacienteActivo?: string;
  /**
   * Ruta base a la que navegar al elegir un paciente, ej. `/dashboard/historial`.
   * Se le agrega `?id=<id_paciente>` — mismo query param canónico `?id=` usado
   * en todo el resto de la app (odontograma, documentos/saldos).
   */
  baseHref: string;
}

/**
 * Buscador/selector de paciente genérico para los 3 módulos clínicos nuevos
 * (Historial, Cotizador, Galería) — generaliza `BuscadorPacienteFinanciero.tsx`
 * (que solo sirve a `/dashboard/documentos`) agregando el prop `baseHref`, en
 * vez de crear una copia casi idéntica por cada módulo. `BuscadorPacienteFinanciero.tsx`
 * se deja intacto para no arriesgar ese flujo ya probado.
 */
export function BuscadorPacienteClinico({ pacientes, idPacienteActivo, baseHref }: BuscadorPacienteClinicoProps) {
  const router = useRouter();
  const [consulta, setConsulta] = useState('');

  const pacientesFiltrados = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter(
      (paciente) =>
        paciente.nombre_completo.toLowerCase().includes(texto) ||
        paciente.id_paciente.toLowerCase().includes(texto),
    );
  }, [consulta, pacientes]);

  function seleccionarPaciente(idPaciente: string): void {
    router.push(`${baseHref}?id=${encodeURIComponent(idPaciente)}`);
  }

  return (
    <div className="w-full max-w-xs shrink-0 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          placeholder="Buscar paciente..."
          className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="max-h-80 space-y-1 overflow-y-auto">
        {pacientesFiltrados.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-400">Ningún paciente coincide con tu búsqueda.</p>
        ) : (
          pacientesFiltrados.map((paciente) => {
            const activo = paciente.id_paciente === idPacienteActivo;
            return (
              <button
                key={paciente.id_paciente}
                type="button"
                onClick={() => seleccionarPaciente(paciente.id_paciente)}
                className={[
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition',
                  activo ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <UserRound className={`h-4 w-4 shrink-0 ${activo ? 'text-primary' : 'text-slate-400'}`} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="block truncate font-medium">{paciente.nombre_completo}</span>
                  <span className="block truncate font-mono text-[11px] text-slate-400">{paciente.id_paciente}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
