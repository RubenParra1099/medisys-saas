'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, MessageCircle, Phone, Search, Sparkles, UserPlus, UserRound, Wallet } from 'lucide-react';
import { ESTILOS_SEVERIDAD, clasificarHallazgo, separarHallazgos } from '@/components/pacientes/hallazgosClinicos';
import type { Paciente } from '@/types';

interface TablaPacientesProps {
  /** Listado completo leído de Google Sheets por `page.tsx` (Server Component). */
  pacientesIniciales: Paciente[];
}

/** Deja solo los dígitos de un teléfono, para armar el link `https://wa.me/<dígitos>`. */
function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

/**
 * Barra de herramientas (buscador + botón "Registrar Paciente") y tabla
 * clínica del listado de pacientes. Es un componente de cliente porque el
 * filtrado por nombre o por alergia/condición ocurre en tiempo real en el
 * navegador, sobre el listado que ya trajo el servidor — no dispara ningún
 * `fetch` adicional.
 */
export function TablaPacientes({ pacientesIniciales }: TablaPacientesProps) {
  const [consulta, setConsulta] = useState('');

  const pacientesFiltrados = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (!texto) return pacientesIniciales;

    return pacientesIniciales.filter((paciente) => {
      if (paciente.nombre_completo.toLowerCase().includes(texto)) return true;
      const hallazgos = separarHallazgos(paciente.antecedentes_medicos);
      return hallazgos.some((hallazgo) => hallazgo.toLowerCase().includes(texto));
    });
  }, [consulta, pacientesIniciales]);

  return (
    <div className="space-y-4">
      {/* Barra de herramientas: buscador a la izquierda, "Registrar Paciente" a la derecha */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-primary">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar por nombre o alergia/condición..."
            className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <Link
          href="/dashboard/pacientes/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Paciente
        </Link>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-semibold text-slate-500">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Nombre Completo</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Teléfono / WhatsApp</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Correo Electrónico</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Alergias / Condiciones</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    {pacientesIniciales.length === 0
                      ? 'Todavía no hay pacientes registrados — usa "Registrar Paciente" para dar de alta al primero.'
                      : 'Ningún paciente coincide con tu búsqueda.'}
                  </td>
                </tr>
              ) : (
                pacientesFiltrados.map((paciente) => {
                  const hallazgos = separarHallazgos(paciente.antecedentes_medicos);

                  return (
                    <tr key={paciente.id_paciente} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 align-top">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-500">
                          {paciente.id_paciente}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {paciente.nombre_completo}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {paciente.telefono ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${paciente.telefono}`}
                              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-primary"
                            >
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {paciente.telefono}
                            </a>
                            <a
                              href={`https://wa.me/${soloDigitos(paciente.telefono)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp"
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {paciente.correo ? (
                          <a
                            href={`mailto:${paciente.correo}`}
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-primary"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {paciente.correo}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {hallazgos.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Sin antecedentes
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {hallazgos.map((hallazgo, indice) => (
                              <span
                                key={`${paciente.id_paciente}-${indice}`}
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_SEVERIDAD[clasificarHallazgo(hallazgo)]}`}
                              >
                                {hallazgo}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/odontograma?id=${encodeURIComponent(paciente.id_paciente)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Ver Odontograma
                          </Link>

                          <Link
                            href={`/dashboard/documentos?id=${encodeURIComponent(paciente.id_paciente)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Cotizador
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
