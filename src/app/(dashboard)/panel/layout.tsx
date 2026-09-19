'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

// TODO: agregar guard de sesión + verificación de estatus_pago === 'activo'
// antes de renderizar cualquier página del panel del médico.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar fijo en desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar deslizable en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex">
            <Sidebar />
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="ml-2 mt-4 h-8 w-8 self-start rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex-1">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-800">MediSys</p>
        </div>

        <main>{children}</main>
      </div>
    </div>
  );
}
