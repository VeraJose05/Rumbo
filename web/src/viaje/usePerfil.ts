// RF-12: el perfil del recorrido, guardado en sessionStorage para no perderlo al recargar.
import { useEffect, useState } from 'react';
import { perfilInicial, type Perfil } from './perfil';

const CLAVE = 'rumbo-viaje';

function leer(): Perfil {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Perfil | null;
    if (guardado) return guardado;
  } catch {
    // Sin almacenamiento (modo privado estricto): se empieza de cero.
  }
  return perfilInicial();
}

export function usePerfil(): [Perfil, (perfil: Perfil) => void] {
  const [perfil, setPerfil] = useState(leer);
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(perfil));
    } catch {
      // Sin almacenamiento: el perfil vive solo en memoria.
    }
  }, [perfil]);
  return [perfil, setPerfil];
}
