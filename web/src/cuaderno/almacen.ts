// RF-12: lo que vive en el móvil (localStorage): viajes guardados y pasaporte. Sin cuentas: si se
// borran los datos del navegador se pierde; por eso el pasaporte se puede exportar e importar.
import { useCallback, useEffect, useState } from 'react';
import type { Guardado } from './guardados';
import type { Visita } from './pasaporte';

function useLocal<T>(clave: string, inicial: T): [T, (cambio: (anterior: T) => T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado) return JSON.parse(guardado) as T;
    } catch {
      // Sin almacenamiento: se empieza vacío.
    }
    return inicial;
  });
  // Si otra pestaña cambia los datos, esta se entera.
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === clave && e.newValue) setValor(JSON.parse(e.newValue) as T);
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, [clave]);
  const cambiar = useCallback(
    (cambio: (anterior: T) => T) =>
      setValor((anterior) => {
        const nuevo = cambio(anterior);
        try {
          localStorage.setItem(clave, JSON.stringify(nuevo));
        } catch {
          // Sin almacenamiento o lleno: se queda en memoria.
        }
        return nuevo;
      }),
    [clave],
  );
  return [valor, cambiar];
}

export const useGuardados = () => useLocal<Guardado[]>('rumbo-viajes', []);
export const usePasaporte = () => useLocal<Visita[]>('rumbo-pasaporte', []);
