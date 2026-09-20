'use client';

import { useState } from 'react';
import { Mail, ShieldCheck, UserPlus2, Users } from 'lucide-react';
import { ModalInvitarUsuario } from '@/components/correos/ModalInvitarUsuario';
import type { UsuarioAutorizado } from '@/types';

interface ListaUsuariosAutorizadosProps {
  usuariosIniciales: UsuarioAutorizado[];
}

const ESTILOS_ROL: Record<UsuarioAutorizado['rol'], string> = {
  Asistente: 'bg-primary/5 text-primary border border-primary/20',
  Socio: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

/**
 * Lista minimalista de correos autorizados (asistentes/socios con acceso al
 * sistema) + botón "Invitar Usuario" que abre `<ModalInvitarUsuario />`. Al
 * invitar con éxito, el nuevo usuario se agrega a la lista local de
 * inmediato (sin esperar un `router.refresh()`), porque el modal ya recibe
 * el registro completo creado en la respuesta del `POST`.
 */
export function ListaUsuariosAutorizados({ usuariosIniciales }: ListaUsuariosAutorizadosProps) {
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [modalAbierto, setModalAbierto] = useState(false);

  function manejarInvitado(usuario: UsuarioAutorizado): void {
    setUsuarios((actuales) => [...actuales, usuario]);
    setModalAbierto(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Usuarios con Acceso</h2>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <UserPlus2 className="h-4 w-4" />
          Invitar Usuario
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Users className="h-6 w-6 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Todavía no has invitado a ningún usuario.</p>
            <p className="max-w-xs text-xs text-slate-400">
              Invita a tus asistentes o socios para que puedan acceder al sistema.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {usuarios.map((usuario) => (
              <li
                key={usuario.id_autorizacion}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {usuario.correo_invitado}
                </span>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS_ROL[usuario.rol]}`}
                >
                  {usuario.rol === 'Socio' && <ShieldCheck className="h-3 w-3" />}
                  {usuario.rol}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalAbierto && (
        <ModalInvitarUsuario onCerrar={() => setModalAbierto(false)} onInvitado={manejarInvitado} />
      )}
    </div>
  );
}
