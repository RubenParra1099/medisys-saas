'use client';

import { useMemo, useState } from 'react';
import { Search, User } from 'lucide-react';
import { PACIENTES_DEMO } from '@/components/odontograma/tipos';
import type { PacienteOdontograma } from '@/components/odontograma/tipos';

interface BuscadorPacientesProps {
  pacienteActivo: PacienteOdontograma;
  onSeleccionar: (paciente: PacienteOdontograma) => void;
}

/**
 * Buscador de pacientes en la parte superior del módulo. Filtra la lista de
 * demostración (`PACIENTES_DEMO`) por nombre a medida que se escribe y
 * muestra los resultados en un desplegable — al seleccionar uno, el
 * odontograma completo cambia a ese paciente (cada paciente tiene su propio
 * estado de superficies e historial, ver `OdontogramaModule.tsx`).
 */
export function BuscadorPacientes({ pacienteActivo, onSeleccionar }: BuscadorPacientesProps) {
  const [consulta, setConsulta] = useState('');
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (!texto) return PACIENTES_DEMO;
    return PACIENTES_DEMO.filter((paciente) => paciente.nombre.toLowerCase().includes(texto));
  }, [consulta]);

  function seleccionar(paciente: PacienteOdontograma) {
    onSeleccionar(paciente);
    setConsulta('');
    setAbierto(false);
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          placeholder={`Buscando: ${pacienteActivo.nombre}`}
          className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {abierto && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          {resultados.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-slate-400">Sin resultados.</li>
          ) : (
            resultados.map((paciente) => (
              <li key={paciente.id}>
                <button
                  type="button"
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => seleccionar(paciente)}
                  className={[
                    'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-slate-50',
                    paciente.id === pacienteActivo.id ? 'bg-primary/5 text-primary' : 'text-slate-600',
                  ].join(' ')}
                >
                  <User className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{paciente.nombre}</span>
                  <span className="shrink-0 text-xs text-slate-400">{paciente.edad} años</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
