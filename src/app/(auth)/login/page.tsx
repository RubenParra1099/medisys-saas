import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { obtenerIdMedicoSesion } from '@/utils/session';

export const dynamic = 'force-dynamic';

/**
 * `/login` — pantalla de acceso del médico. Ruta pública dentro del grupo
 * `(auth)`, fuera del guard de `(dashboard)/dashboard/layout.tsx`.
 */
export default function LoginPage() {
  // Si ya hay una cookie de sesión válida (firma correcta), no tiene sentido
  // mostrar el login de nuevo.
  if (obtenerIdMedicoSesion()) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight text-slate-800">
            Medi<span className="text-primary">Sys</span>
          </p>
          <p className="mt-1.5 text-sm text-slate-500">Panel administrativo para médicos</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Problemas para entrar? Contacta a soporte de tu clínica.
        </p>
      </div>
    </main>
  );
}
