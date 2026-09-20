'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff, ScanLine, UploadCloud } from 'lucide-react';
import { ModalSubirImagen } from '@/components/galeria/ModalSubirImagen';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { FotoGaleria } from '@/types';

interface GridGaleriaProps {
  idPaciente: string;
  fotosIniciales: FotoGaleria[];
}

/** Formatea "YYYY-MM-DD" a un texto legible en español, ej. "19 sep 2026". */
function formatearFecha(fecha: string): string {
  const partes = fecha.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return fecha;
  const [anio, mes, dia] = partes;
  const formateador = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return formateador.format(new Date(anio, mes - 1, dia));
}

/**
 * Visualizador tipo Grid de tarjetas estéticas para radiografías/fotos del
 * paciente, organizadas por fecha (más reciente primero — el servidor ya
 * las trae en ese orden). El botón "Subir Imagen" abre `ModalSubirImagen`,
 * que simula la carga (ver esa nota en el propio componente).
 */
export function GridGaleria({ idPaciente, fotosIniciales }: GridGaleriaProps) {
  const [fotos, setFotos] = useState<FotoGaleria[]>(fotosIniciales);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);

  function manejarSubida(foto: FotoGaleria): void {
    setFotos((actuales) => [foto, ...actuales]);
    setModalAbierto(false);
    setMostrarToast(true);
    setTimeout(() => setMostrarToast(false), AUTO_CIERRE_TOAST_FLOTANTE_MS);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Fotos y radiografías</p>
          <p className="text-xs text-slate-400">
            {fotos.length === 0
              ? 'Todavía no hay imágenes en el expediente.'
              : `${fotos.length} imagen${fotos.length === 1 ? '' : 'es'} guardada${fotos.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:from-primary/90 hover:to-blue-600/90"
        >
          <UploadCloud className="h-4 w-4" />
          Subir Imagen
        </button>
      </div>

      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ImageOff className="h-6 w-6 text-primary" />
          </span>
          <p className="text-sm font-medium text-slate-700">Sin imágenes registradas todavía.</p>
          <p className="max-w-sm text-xs text-slate-400">
            Usa &ldquo;Subir Imagen&rdquo; para agregar la primera radiografía o fotografía de este paciente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((foto) => (
            <div key={foto.id_foto} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="relative aspect-[4/3] w-full bg-slate-100">
                <Image
                  src={foto.imagen_url}
                  alt={foto.descripcion}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
                <span
                  className={[
                    'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow',
                    foto.tipo_archivo === 'Radiografia'
                      ? 'bg-indigo-600/90 text-white'
                      : 'bg-white/90 text-slate-700',
                  ].join(' ')}
                >
                  {foto.tipo_archivo === 'Radiografia' ? (
                    <ScanLine className="h-3 w-3" />
                  ) : (
                    <UploadCloud className="h-3 w-3" />
                  )}
                  {foto.tipo_archivo === 'Radiografia' ? 'Radiografía' : 'Fotografía'}
                </span>
              </div>

              <div className="p-3.5">
                <p className="line-clamp-2 text-sm text-slate-700">{foto.descripcion}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatearFecha(foto.fecha)}</span>
                  <span className="font-mono">{foto.id_foto}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalSubirImagen idPaciente={idPaciente} onCerrar={() => setModalAbierto(false)} onSubida={manejarSubida} />
      )}

      {mostrarToast && (
        <ToastFlotante
          tipo="exito"
          titulo="Imagen agregada"
          mensaje="La imagen se guardó correctamente en la Galería Clínica."
          onCerrar={() => setMostrarToast(false)}
        />
      )}
    </div>
  );
}
