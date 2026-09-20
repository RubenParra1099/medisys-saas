'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { AlarmClockCheck, BellRing, Clock3 } from 'lucide-react';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ToastFlotante, AUTO_CIERRE_TOAST_FLOTANTE_MS } from '@/components/ui/ToastFlotante';
import type { ApiRespuesta, ConfiguracionRecordatorios } from '@/types';

interface MesaControlRecordatoriosProps {
  configuracionInicial: ConfiguracionRecordatorios;
}

interface FilaInterruptor {
  clave: keyof ConfiguracionRecordatorios;
  titulo: string;
  descripcion: string;
  icono: ComponentType<{ className?: string }>;
}

const FILAS_ANTICIPACION: FilaInterruptor[] = [
  {
    clave: 'recordatorio24hActivo',
    titulo: 'Recordatorio 24 horas antes',
    descripcion: 'Envía un recordatorio automático un día antes de la cita.',
    icono: AlarmClockCheck,
  },
  {
    clave: 'recordatorio2hActivo',
    titulo: 'Recordatorio 2 horas antes',
    descripcion: 'Envía un segundo recordatorio el mismo día, 2 horas antes.',
    icono: Clock3,
  },
];

/**
 * Mesa de control visual de Recordatorios de Citas — interruptores que se
 * guardan de inmediato al cambiar (sin botón "Guardar" explícito, como una
 * pantalla de ajustes típica) vía `POST /api/recordatorios/actualizar`.
 *
 * El interruptor maestro "Alertas Automáticas Activas" deshabilita
 * visualmente (pero no borra) la selección de anticipación cuando está
 * apagado — apagarlo es la forma de silenciar todos los recordatorios sin
 * perder qué anticipaciones tenía elegidas el médico.
 *
 * Nota de alcance: esta pantalla configura LA PREFERENCIA (qué anticipación
 * usar, si las alertas están activas) — el envío real todavía no dispara
 * nada, porque las APIs externas de mensajería (WhatsApp/correo) son el
 * siguiente paso de este proyecto, tal como se indicó al pedir este módulo.
 */
export function MesaControlRecordatorios({ configuracionInicial }: MesaControlRecordatoriosProps) {
  const [configuracion, setConfiguracion] = useState(configuracionInicial);
  const [guardandoClave, setGuardandoClave] = useState<keyof ConfiguracionRecordatorios | null>(null);
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  function mostrarToast(tipo: 'exito' | 'error', mensaje: string): void {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), AUTO_CIERRE_TOAST_FLOTANTE_MS);
  }

  async function alternar(clave: keyof ConfiguracionRecordatorios): Promise<void> {
    if (guardandoClave) return; // evita disparar dos guardados simultáneos que se pisen entre sí

    const nuevaConfiguracion: ConfiguracionRecordatorios = {
      ...configuracion,
      [clave]: !configuracion[clave],
    };

    setConfiguracion(nuevaConfiguracion); // optimista — se revierte abajo si falla
    setGuardandoClave(clave);

    try {
      const respuesta = await fetch('/api/recordatorios/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaConfiguracion),
      });

      const cuerpo: ApiRespuesta<ConfiguracionRecordatorios> = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setConfiguracion(configuracion); // revierte al valor anterior
        mostrarToast('error', cuerpo.error ?? 'No se pudo guardar el cambio. Intenta de nuevo.');
        return;
      }

      mostrarToast('exito', 'Tus preferencias de recordatorios se guardaron correctamente.');
    } catch (error) {
      console.error('[MesaControlRecordatorios] Error de red guardando preferencias:', error);
      setConfiguracion(configuracion);
      mostrarToast('error', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardandoClave(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Interruptor maestro */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Alertas Automáticas Activas</p>
            <p className="text-xs text-slate-500">
              Interruptor maestro — si está apagado, no se envía ningún recordatorio sin importar la anticipación elegida abajo.
            </p>
          </div>
          <ToggleSwitch
            activo={configuracion.alertasAutomaticasActivas}
            onChange={() => alternar('alertasAutomaticasActivas')}
            disabled={guardandoClave !== null}
            etiquetaAccesible="Alertas automáticas activas"
          />
        </div>

        {/* Anticipación de los recordatorios */}
        <div
          className={[
            'divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm transition',
            configuracion.alertasAutomaticasActivas ? '' : 'opacity-50',
          ].join(' ')}
        >
          {FILAS_ANTICIPACION.map((fila) => {
            const Icono = fila.icono;
            return (
              <div key={fila.clave} className="flex items-center gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Icono className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{fila.titulo}</p>
                  <p className="text-xs text-slate-500">{fila.descripcion}</p>
                </div>
                <ToggleSwitch
                  activo={configuracion[fila.clave]}
                  onChange={() => alternar(fila.clave)}
                  disabled={guardandoClave !== null || !configuracion.alertasAutomaticasActivas}
                  etiquetaAccesible={fila.titulo}
                />
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <ToastFlotante
          tipo={toast.tipo}
          titulo={toast.tipo === 'exito' ? 'Preferencias guardadas' : 'No se pudo guardar'}
          mensaje={toast.mensaje}
          onCerrar={() => setToast(null)}
        />
      )}
    </>
  );
}
