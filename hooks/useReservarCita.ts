'use client';

import { useState } from 'react';
import type { ApiRespuesta, Cita, CrearCitaInput } from '@/types';

/**
 * Hook cliente que encapsula la llamada a POST /api/booking/crear-cita.
 * Úsalo desde `FormularioReserva.tsx`.
 */
export function useReservarCita() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reservar(input: CrearCitaInput): Promise<Cita | null> {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/booking/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json: ApiRespuesta<Cita> = await respuesta.json();

      if (!respuesta.ok || !json.ok || !json.data) {
        setError(json.error ?? 'No fue posible agendar la cita.');
        return null;
      }

      return json.data;
    } catch (err) {
      console.error('[useReservarCita] Error de red:', err);
      setError('Error de conexión. Intenta de nuevo.');
      return null;
    } finally {
      setCargando(false);
    }
  }

  return { reservar, cargando, error };
}
