// RF-14: dónde está cada parada. Los lugares de la guía se geolocalizaron una vez con Nominatim
// (src/ingest/geocodificar.ts → /datos/coordenadas.json); aquí se busca cada parada entre ellos con
// el mismo criterio que la verificación del servidor (src/flows/rag.ts): las palabras del nombre,
// seguidas, sin tildes, sin la ciudad al final ni los artículos de los extremos.
import { useEffect, useState } from 'react';

export interface LugarEnMapa {
  nombre: string;
  seccion: string;
  lat: number;
  lon: number;
}

export interface CoordenadasDestino {
  centro: [number, number];
  lugares: LugarEnMapa[];
}

const VACIAS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'un', 'una']);
// Una sola de estas palabras no identifica un lugar («Centro», «Mercado»).
const GENERICAS = new Set(['centro', 'barrio', 'plaza', 'calle', 'mercado', 'parque', 'museo', 'playa', 'iglesia', 'suburbios', 'puerto']);

const palabras = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

function nombreDeLugar(lugar: string, destino: string): string[] {
  const nombre = palabras(lugar.replace(/\([^)]*\)/g, ' '));
  const ciudad = palabras(destino);
  if (ciudad.length && ciudad.every((p, i) => nombre[nombre.length - ciudad.length + i] === p)) nombre.splice(nombre.length - ciudad.length);
  while (nombre.length && VACIAS.has(nombre[0]!)) nombre.shift();
  while (nombre.length && VACIAS.has(nombre.at(-1)!)) nombre.pop();
  return nombre;
}

/** Posición de `buscadas` seguidas dentro de `texto`, o -1. */
function posicion(texto: string[], buscadas: string[]): number {
  for (let i = 0; i + buscadas.length <= texto.length; i++) {
    if (buscadas.every((p, j) => texto[i + j] === p)) return i;
  }
  return -1;
}

const identifica = (nombre: string[]) => nombre.length > 1 || (nombre.length === 1 && nombre[0]!.length >= 4 && !GENERICAS.has(nombre[0]!));

/**
 * El lugar de la guía que corresponde a una parada, o null. Primero, lugares de la guía cuyo nombre
 * aparece en la parada (el que antes aparezca, «La Giralda y la Catedral» → Giralda); si no, la
 * parada dentro del nombre de un lugar de la guía, solo si dice algo más que una palabra.
 */
export function ubicarLugar(lugar: string, destino: string, lugares: LugarEnMapa[]): LugarEnMapa | null {
  const buscado = nombreDeLugar(lugar, destino);
  if (!buscado.length) return null;
  let mejor: { lugar: LugarEnMapa; pos: number; largo: number } | null = null;
  for (const candidato of lugares) {
    const nombre = nombreDeLugar(candidato.nombre, destino);
    if (!identifica(nombre)) continue;
    const pos = posicion(buscado, nombre);
    if (pos >= 0 && (!mejor || pos < mejor.pos || (pos === mejor.pos && nombre.length > mejor.largo))) {
      mejor = { lugar: candidato, pos, largo: nombre.length };
    }
  }
  if (mejor) return mejor.lugar;
  if (buscado.length < 2) return null;
  const contienen = lugares.filter((c) => posicion(nombreDeLugar(c.nombre, destino), buscado) >= 0);
  return contienen.sort((a, b) => a.nombre.length - b.nombre.length)[0] ?? null;
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
