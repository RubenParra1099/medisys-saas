'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import type { ApiRespuesta } from '@/types';

interface LoginResponseData {
  id_medico: string;
}

/**
 * Formulario de login — client component embebido en `(auth)/login/page.tsx`
 * (server component). Maneja estados de carga/error y, al recibir 200 de
 * `/api/auth/login`, redirige a `/dashboard`.
 */
export function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const respuesta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      const json: ApiRespuesta<LoginResponseData> = await respuesta.json();

      if (!respuesta.ok || !json.ok) {
        setError(json.error ?? 'No fue posible iniciar sesión.');
        setCargando(false);
        return;
      }

      // La cookie de sesión ya quedó configurada por la respuesta (Set-Cookie).
      // `refresh()` obliga a que el layout de /dashboard vuelva a leerla en
      // el siguiente render de servidor antes de navegar.
      router.refresh();
      router.push('/dashboard');
    } catch (error) {
      console.error('[LoginForm] Error de red al iniciar sesión:', error);
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="usuario" className="mb-1.5 block text-sm font-medium text-slate-700">
          Correo o usuario
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="usuario"
            name="usuario"
            type="text"
            autoComplete="username"
            required
            value={usuario}
            onChange={(evento) => setUsuario(evento.target.value)}
            disabled={cargando}
            placeholder="tu@correo.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            disabled={cargando}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((valor) => !valor)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {cargando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando…
          </>
        ) : (
          'Iniciar sesión'
        )}
      </button>
    </form>
  );
}
