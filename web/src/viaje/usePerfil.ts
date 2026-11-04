// RF-12: estado guardado en sessionStorage (perfil del recorrido e itinerario) para no perderlo al recargar.
import { useEffect, useState } from 'react';
import type { ViajeConId } from '../cuaderno/guardados';
import { perfilInicial, type Perfil } from './perfil';

function useSesion<T>(clave: string, inicial: () => T): [T, (valor: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = sessionStorage.getItem(clave);
      if (guardado) return JSON.parse(guardado) as T;
    } catch {
      // Sin almacenamiento (modo privado estricto): se empieza de cero.
    }
    return inicial();
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento: vive solo en memoria.
    }
  }, [clave, valor]);
  return [valor, setValor];
}

export const usePerfil = () => useSesion<Perfil>('rumbo-viaje', () => perfilInicial());
/** El viaje ya planificado (perfil, itinerario y lugares quitados); null hasta planificar. */
export const useViaje = () => useSesion<ViajeConId | null>('rumbo-viaje-actual', () => null);
