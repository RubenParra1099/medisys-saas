'use client';

import type { ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CampoBaseProps {
  id: string;
  label: string;
  icono: LucideIcon;
  placeholder?: string;
  required?: boolean;
  /** Mensaje de validación a mostrar debajo del campo; también le pone borde rojo. */
  error?: string;
  className?: string;
}

interface CampoInputProps extends CampoBaseProps {
  as: 'input';
  type?: 'text' | 'tel' | 'email' | 'date';
  value: string;
  onChange: (valor: string) => void;
  /** Ej. la fecha de hoy, para no dejar elegir una fecha de nacimiento futura en el date picker. */
  max?: string;
}

interface CampoTextareaProps extends CampoBaseProps {
  as: 'textarea';
  value: string;
  onChange: (valor: string) => void;
  rows?: number;
}

type CampoFormularioProps = CampoInputProps | CampoTextareaProps;

/**
 * Campo de formulario premium reutilizable: label + input/textarea con
 * ícono de `lucide-react` incrustado a la izquierda dentro de una caja
 * `rounded-xl`, y un mensaje de error opcional debajo. Usado por
 * `FormularioNuevoPaciente.tsx` para los 5 campos de captura de pacientes.
 */
export function CampoFormulario(props: CampoFormularioProps) {
  const { id, label, icono: Icono, placeholder, required, error, className } = props;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={[
          'flex items-start gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
          error ? 'border-red-300' : 'border-slate-200',
        ].join(' ')}
      >
        <Icono className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />

        {props.as === 'textarea' ? (
          <textarea
            id={id}
            value={props.value}
            onChange={(evento: ChangeEvent<HTMLTextAreaElement>) => props.onChange(evento.target.value)}
            placeholder={placeholder}
            rows={props.rows ?? 3}
            className="w-full flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        ) : (
          <input
            id={id}
            type={props.type ?? 'text'}
            value={props.value}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => props.onChange(evento.target.value)}
            placeholder={placeholder}
            max={props.max}
            className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
