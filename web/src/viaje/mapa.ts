// RF-14: coordenadas de los lugares (/datos/coordenadas.json, de Nominatim, Wikipedia y Wikidata)
// y enlaces a Google Maps. La búsqueda de cada parada (ubicarLugar) es compartida con el servidor.
import { useEffect, useState } from 'react';

export type { LugarEnMapa } from '../../../src/compartido/ubicar';
import { palabras, type LugarEnMapa } from '../../../src/compartido/ubicar';
export { ubicarLugar } from '../../../src/compartido/ubicar';

export interface CoordenadasDestino {
  centro: [number, number];
  lugares: LugarEnMapa[];
}

// El archivo es pequeño y lo guarda el service worker: se pide una vez por sesión.
let pendiente: Promise<Record<string, CoordenadasDestino>> | null = null;
function cargarCoordenadas() {
  pendiente ??= fetch('/datos/coordenadas.json')
    .then((r) => (r.ok ? r.json() : { destinos: {} }))
    .then((datos: { destinos: Record<string, CoordenadasDestino> }) => datos.destinos)
    .catch(() => ({}));
  return pendiente;
}

/** Coordenadas de un destino (se piden al activarse el mapa); undefined mientras cargan, null si no hay. */
export function useCoordenadas(destino: string | null | undefined, activo: boolean): CoordenadasDestino | null | undefined {
  const [coordenadas, setCoordenadas] = useState<CoordenadasDestino | null | undefined>(undefined);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    void cargarCoordenadas().then((todas) => vigente && setCoordenadas((destino && todas[destino]) || null));
    return () => {
      vigente = false;
    };
  }, [destino, activo]);
  return coordenadas;
}

// ---------- Ir hasta allí: Google Maps ----------
// Navegar (calles, a pie, transporte) lo hace Google Maps mejor que un mapa propio, gratis y sin
// clave con sus «Maps URLs». Se busca por nombre y ciudad, así que también encuentra los lugares
// que no tienen coordenadas en Rumbo.

const MAPS = 'https://www.google.com/maps/dir/';

/** «Nombre, Ciudad» (sin repetir la ciudad si el nombre ya la lleva). */
function consulta(lugar: string, destino: string): string {
  const nombre = lugar.trim();
  return palabras(nombre).join(' ').includes(palabras(destino).join(' ')) ? nombre : `${nombre}, ${destino}`;
}

function urlMaps(parametros: Record<string, string>): string {
  return `${MAPS}?${new URLSearchParams({ api: '1', ...parametros, travelmode: 'walking' })}`;
}

export const urlComoLlegar = (lugar: string, destino: string) => urlMaps({ destination: consulta(lugar, destino) });

/** Ruta a pie por todas las paradas del día, en orden. */
export function urlRutaDelDia(lugares: string[], destino: string): string {
  if (lugares.length < 2) return urlComoLlegar(lugares[0] ?? destino, destino);
  const [primero, ...resto] = lugares.map((l) => consulta(l, destino));
  const ultimo = resto.pop()!;
  return urlMaps({ origin: primero!, destination: ultimo, ...(resto.length ? { waypoints: resto.join('|') } : {}) });
}
