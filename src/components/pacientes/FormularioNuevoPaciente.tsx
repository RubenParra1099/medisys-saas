'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, Loader2, Mail, Phone, User, UserPlus } from 'lucide-react';
import { CampoFormulario } from '@/components/pacientes/CampoFormulario';
import type { ApiRespuesta, CrearPacienteInput } from '@/types';

interface CrearPacienteResultado {
  idPaciente: string;
}

interface ErroresFormulario {
  nombreCompleto?: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
}

const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FECHA_DE_HOY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" — tope del date picker

/**
 * Valida el formulario del lado del cliente — es solo una ayuda de UX
 * (feedback inmediato por campo); la validación real y vinculante ocurre
 * en `POST /api/pacientes/crear` (`validarInput` en ese route.ts), que usa
 * exactamente las mismas reglas.
 */
function validarFormulario(
  nombreCompleto: string,
  telefono: string,
  correo: string,
  fechaNacimiento: string,
): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (nombreCompleto.trim().length < 3) {
    errores.nombreCompleto = 'Escribe el nombre completo del paciente (mínimo 3 caracteres).';
  }

  if (!REGEX_TELEFONO.test(telefono.trim())) {
    errores.telefono = 'Escribe un teléfono válido (7-20 caracteres: números, espacios, "+", "-" o paréntesis).';
  }

  if (correo.trim() && !REGEX_CORREO.test(correo.trim())) {
    errores.correo = 'El correo no tiene un formato válido.';
  }

  if (!fechaNacimiento) {
    errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.';
  } else if (fechaNacimiento > FECHA_DE_HOY) {
    errores.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.';
  }

  return errores;
}

/**
 * Formulario "Captura de Pacientes Nuevos" — al registrar con éxito,
 * redirige directo al odontograma de ESE paciente
 * (`/dashboard/odontograma?paciente=<id_paciente>`), para que el dentista
 * pueda empezar el diagnóstico de inmediato sin un paso intermedio.
 */
export function FormularioNuevoPaciente() {
  const router = useRouter();

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [antecedentesMedicos, setAntecedentesMedicos] = useState('');

  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (enviando) return;

    const erroresEncontrados = validarFormulario(nombreCompleto, telefono, correo, fechaNacimiento);
    setErrores(erroresEncontrados);
    setErrorGeneral(null);

    if (Object.keys(erroresEncontrados).length > 0) return;

    const payload: CrearPacienteInput = {
      nombreCompleto: nombreCompleto.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
      fechaNacimiento,
      antecedentesMedicos: antecedentesMedicos.trim(),
    };

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/pacientes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<CrearPacienteResultado> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setErrorGeneral(cuerpo.error ?? 'Ocurrió un error inesperado al registrar al paciente. Intenta de nuevo.');
        setEnviando(false);
        return;
      }

      // Redirige directo al odontograma del paciente recién creado — se
      // deja `enviando` en `true` a propósito (el botón sigue mostrando el
      // spinner) hasta que la navegación reemplace esta página. `?id=` es
      // el mismo query param canónico que usa el botón "Ver Odontograma"
      // de la tabla de pacientes (`TablaPacientes.tsx`).
      router.push(`/dashboard/odontograma?id=${encodeURIComponent(cuerpo.data.idPaciente)}`);
    } catch (error) {
      console.error('[FormularioNuevoPaciente] Error de red registrando al paciente:', error);
      setErrorGeneral('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8"
      noValidate
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CampoFormulario
          as="input"
          id="nombreCompleto"
          label="Nombre completo"
          icono={User}
          type="text"
          placeholder="Ej. María Fernanda López"
          required
          value={nombreCompleto}
          onChange={setNombreCompleto}
          error={errores.nombreCompleto}
        />

        <CampoFormulario
          as="input"
          id="telefono"
          label="Teléfono"
          icono={Phone}
          type="tel"
          placeholder="Ej. 55 1234 5678"
          required
          value={telefono}
          onChange={setTelefono}
          error={errores.telefono}
        />

        <CampoFormulario
          as="input"
          id="correo"
          label="Correo electrónico"
          icono={Mail}
          type="email"
          placeholder="Ej. paciente@correo.com (opcional)"
          value={correo}
          onChange={setCorreo}
          error={errores.correo}
        />

        <CampoFormulario
          as="input"
          id="fechaNacimiento"
          label="Fecha de nacimiento"
          icono={Calendar}
          type="date"
          required
          max={FECHA_DE_HOY}
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
          error={errores.fechaNacimiento}
        />

        <CampoFormulario
          as="textarea"
          id="antecedentesMedicos"
          label="Antecedentes médicos (alergias/enfermedades)"
          icono={FileText}
          placeholder="Ej. Alergia a la penicilina, hipertensión controlada... (opcional)"
          rows={4}
          value={antecedentesMedicos}
          onChange={setAntecedentesMedicos}
          className="sm:col-span-2"
        />
      </div>

      {errorGeneral && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorGeneral}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <p className="mr-auto text-xs text-slate-400">
          <span className="text-red-500">*</span> Campos requeridos.
        </p>

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {enviando ? 'Registrando…' : 'Registrar Paciente'}
        </button>
      </div>
    </form>
  );
}
