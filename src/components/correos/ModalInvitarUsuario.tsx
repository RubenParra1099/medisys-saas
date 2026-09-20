'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Mail, ShieldCheck, UserPlus2, X } from 'lucide-react';
import type { ApiRespuesta, InvitarUsuarioInput, RolUsuarioAutorizado, UsuarioAutorizado } from '@/types';

interface ModalInvitarUsuarioProps {
  onCerrar: () => void;
  /** Se dispara tras un `POST` exitoso, con el usuario ya creado, para insertarlo en la lista sin recargar. */
  onInvitado: (usuario: UsuarioAutorizado) => void;
}

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal minimalista "Invitar Usuario" — captura un correo y un rol
 * (Asistente/Socio) e inserta la invitación de forma asíncrona vía
 * `POST /api/usuarios-autorizados/invitar`.
 */
export function ModalInvitarUsuario({ onCerrar, onInvitado }: ModalInvitarUsuarioProps) {
  const [correoInvitado, setCorreoInvitado] = useState('');
  const [rol, setRol] = useState<RolUsuarioAutorizado>('Asistente');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (enviando) return;

    if (!REGEX_CORREO.test(correoInvitado.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    const payload: InvitarUsuarioInput = { correoInvitado: correoInvitado.trim(), rol };

    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/usuarios-autorizados/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<UsuarioAutorizado> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setError(cuerpo.error ?? 'Ocurrió un error inesperado al invitar al usuario. Intenta de nuevo.');
        setEnviando(false);
        return;
      }

      onInvitado(cuerpo.data);
    } catch (err) {
      console.error('[ModalInvitarUsuario] Error de red invitando al usuario:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Invitar Usuario</h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="p-6" noValidate>
          <div className="mb-5">
            <label htmlFor="correoInvitado" className="mb-1.5 block text-sm font-medium text-slate-700">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <div
              className={[
                'flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
                error ? 'border-red-300' : 'border-slate-200',
              ].join(' ')}
            >
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="correoInvitado"
                type="email"
                value={correoInvitado}
                onChange={(evento) => setCorreoInvitado(evento.target.value)}
                placeholder="asistente@correo.com"
                className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Rol</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRol('Asistente')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  rol === 'Asistente'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <UserPlus2 className="h-4 w-4" />
                Asistente
              </button>

              <button
                type="button"
                onClick={() => setRol('Socio')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  rol === 'Socio'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <ShieldCheck className="h-4 w-4" />
                Socio
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus2 className="h-4 w-4" />}
              {enviando ? 'Invitando…' : 'Invitar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
