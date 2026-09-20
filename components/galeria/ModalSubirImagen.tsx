'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, ScanLine, UploadCloud, X } from 'lucide-react';
import type { ApiRespuesta, FotoGaleria, SubirFotoGaleriaInput, TipoArchivoGaleria } from '@/types';

interface ModalSubirImagenProps {
  idPaciente: string;
  onCerrar: () => void;
  /** Se dispara tras un `POST` exitoso, con la foto ya creada, para insertarla en el grid sin recargar. */
  onSubida: (foto: FotoGaleria) => void;
}

/**
 * Modal "Subir Imagen" — SIMULA la carga de un archivo (no existe todavía
 * infraestructura real de carga): captura solo la descripción y el tipo de
 * archivo (Radiografía/Fotografía); `POST /api/galeria/subir` genera del
 * lado del servidor una URL de placeholder determinística. Tal como se pidió
 * ("simule la carga del archivo, capture una URL de prueba... o la
 * descripción").
 */
export function ModalSubirImagen({ idPaciente, onCerrar, onSubida }: ModalSubirImagenProps) {
  const [descripcion, setDescripcion] = useState('');
  const [tipoArchivo, setTipoArchivo] = useState<TipoArchivoGaleria>('Fotografia');
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (subiendo) return;

    if (descripcion.trim().length < 3) {
      setError('Escribe una descripción (mínimo 3 caracteres).');
      return;
    }

    const payload: SubirFotoGaleriaInput = { idPaciente, descripcion: descripcion.trim(), tipoArchivo };

    setSubiendo(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/galeria/subir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const cuerpo: ApiRespuesta<FotoGaleria> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
        setError(cuerpo.error ?? 'Ocurrió un error inesperado al subir la imagen. Intenta de nuevo.');
        setSubiendo(false);
        return;
      }

      onSubida(cuerpo.data);
    } catch (err) {
      console.error('[ModalSubirImagen] Error de red subiendo la imagen:', err);
      setError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      setSubiendo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <UploadCloud className="h-4 w-4 text-primary" />
            Subir Imagen
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={subiendo}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="p-6" noValidate>
          <div className="mb-5 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <UploadCloud className="h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-400">
              Simulación de carga — no existe todavía infraestructura real de archivos.
              <br />
              Se generará una imagen de prueba para esta referencia.
            </p>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Tipo de archivo</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoArchivo('Fotografia')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  tipoArchivo === 'Fotografia'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <UploadCloud className="h-4 w-4" />
                Fotografía
              </button>

              <button
                type="button"
                onClick={() => setTipoArchivo('Radiografia')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                  tipoArchivo === 'Radiografia'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                <ScanLine className="h-4 w-4" />
                Radiografía
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="descripcion" className="mb-1.5 block text-sm font-medium text-slate-700">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              rows={2}
              placeholder="Ej. Radiografía panorámica previa a tratamiento de ortodoncia"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={subiendo}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={subiendo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {subiendo ? 'Subiendo…' : 'Subir Imagen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
