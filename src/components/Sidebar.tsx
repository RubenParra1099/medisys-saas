'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  Building2,
  Calculator,
  CalendarClock,
  FileText,
  Globe,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  BellRing,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';

interface EnlaceNav {
  etiqueta: string;
  href: string;
  icono: ComponentType<{ className?: string }>;
  contador?: number;
  etiquetaEstado?: string;
  externo?: boolean;
}

interface SidebarProps {
  /** id_medico del consultorio activo, para armar el link del Portal de Reservas. */
  idMedico?: string;
  /** Contador de notificaciones pendientes en Agenda Médica. */
  contadorAgendaHoy?: number;
  nombreClinica?: string;
}

/** Menú lateral fijo del panel administrativo — look & feel SaaS médico premium. */
export function Sidebar({ idMedico, contadorAgendaHoy = 0, nombreClinica = 'MediSys' }: SidebarProps) {
  const pathname = usePathname();

  const seccionClinica: EnlaceNav[] = [
    { etiqueta: 'Agenda Médica', href: '/dashboard', icono: CalendarClock, contador: contadorAgendaHoy },
    { etiqueta: 'Odontograma IA', href: '/dashboard/odontograma', icono: Sparkles },
    { etiqueta: 'Cotizador Presupuestos', href: '/dashboard/cotizador', icono: Calculator },
    { etiqueta: 'Historial Clínico', href: '/dashboard/historial', icono: FileText },
    { etiqueta: 'Galería Clínica', href: '/dashboard/galeria', icono: ImageIcon },
  ];

  const seccionGestion: EnlaceNav[] = [
    { etiqueta: 'Pacientes', href: '/dashboard/pacientes', icono: Users },
    { etiqueta: 'Documentos & Saldos', href: '/dashboard/documentos', icono: Wallet },
    { etiqueta: 'Bot WhatsApp IA', href: '/dashboard/whatsapp', icono: MessageCircle },
    { etiqueta: 'Recordatorios Citas', href: '/dashboard/recordatorios', icono: BellRing },
    {
      etiqueta: 'Portal Reservas',
      href: idMedico ? `/medicos/${idMedico}` : '/buscar',
      icono: Globe,
      etiquetaEstado: 'Público',
      externo: true,
    },
  ];

  const seccionConfig: EnlaceNav[] = [
    { etiqueta: 'Mi Consultorio', href: '/dashboard/consultorio', icono: Building2 },
    { etiqueta: 'Correos Autorizados', href: '/dashboard/correos', icono: Mail },
  ];

  function renderGrupo(titulo: string, enlaces: EnlaceNav[]) {
    return (
      <div className="mb-6">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{titulo}</p>
        <ul className="space-y-0.5">
          {enlaces.map((enlace) => {
            const activo = pathname === enlace.href;
            const Icono = enlace.icono;

            return (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  target={enlace.externo ? '_blank' : undefined}
                  rel={enlace.externo ? 'noreferrer' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                    activo ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  ].join(' ')}
                >
                  <Icono className={`h-4 w-4 shrink-0 ${activo ? 'text-primary' : 'text-slate-400'}`} />
                  <span className="flex-1 truncate">{enlace.etiqueta}</span>
                  {typeof enlace.contador === 'number' && enlace.contador > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                      {enlace.contador}
                    </span>
                  )}
                  {enlace.etiquetaEstado && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      {enlace.etiquetaEstado}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-100 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
          {nombreClinica.charAt(0)}
        </div>
        <p className="flex-1 text-sm font-bold text-slate-800">{nombreClinica}</p>
        <span className="rounded-full bg-gradient-to-r from-primary to-blue-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Pro
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {renderGrupo('Clínica Dental', seccionClinica)}
        {renderGrupo('Gestión & Pacientes', seccionGestion)}
        {renderGrupo('Configuración', seccionConfig)}
      </nav>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Google Sheets: Conectado
        </div>
      </div>
    </aside>
  );
}
