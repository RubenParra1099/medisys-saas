'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface PortalTopBarProps {
  /** URL del spreadsheet vinculado (construida en el server a partir de GOOGLE_SHEET_ID). */
  sheetUrl?: string;
}

/** Barra superior del portal público: título, botón de sincronizar y acceso al Sheet vinculado. */
export function PortalTopBar({ sheetUrl }: PortalTopBarProps) {
  const router = useRouter();
  const [sincronizando, setSincronizando] = useState(false);

  function sincronizar() {
    setSincronizando(true);
    router.refresh();
    // Pequeño respiro visual para que el spinner se note incluso en conexiones rápidas.
    setTimeout(() => setSincronizando(false), 700);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-slate-800">Portal de Reservas</p>
          <p className="text-xs text-slate-400">Agenda pública conectada a Google Sheets</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sincronizar}
            disabled={sincronizando}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
          </button>

          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-dark"
            >
              Ver Sheet
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
