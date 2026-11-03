// RF-12: rutas en el hash de la URL (#/viaje/gustos). Funciona en cualquier servidor estático y con
// el botón «atrás» del navegador, sin librería de rutas.
import { useCallback, useEffect, useState } from 'react';
import { PASOS, type Paso } from './viaje/pasos';

export type Ruta = { pantalla: 'portada' } | { pantalla: 'viaje'; paso: Paso };

export function leerRuta(hash: string): Ruta {
  const [pantalla, paso] = hash.replace(/^#\/?/, '').split('/');
  if (pantalla === 'viaje') {
    return { pantalla: 'viaje', paso: PASOS.includes(paso as Paso) ? (paso as Paso) : 'destino' };
  }
  return { pantalla: 'portada' };
}

export const rutaPaso = (paso: Paso) => `#/viaje/${paso}`;

/** Ruta actual y función para cambiarla (reemplazar = sin añadir una entrada al historial). */
export function useRuta(): [Ruta, (hash: string, reemplazar?: boolean) => void] {
  const [ruta, setRuta] = useState(() => leerRuta(location.hash));
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leerRuta(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  const navegar = useCallback((hash: string, reemplazar = false) => {
    if (reemplazar) {
      history.replaceState(null, '', hash);
      setRuta(leerRuta(hash));
    } else {
      location.hash = hash;
    }
  }, []);
  return [ruta, navegar];
}
