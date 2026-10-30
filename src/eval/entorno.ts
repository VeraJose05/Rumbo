// F5 (RNF-03): lo que comparten los scripts de evaluación: el corpus de cada destino y la versión del código.
import { execSync } from 'node:child_process';
import type { Collection } from 'chromadb';
import { buscarDestino } from '../config/destinos.js';

/** Commit con el que se generó o se midió cada resultado (RNF-03). */
export function versionCodigo(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'desconocido';
  }
}

/** Devuelve una función que da todos los fragmentos de la guía de un destino (vacío fuera del corpus), leídos una vez. */
export function lectorCorpus(coleccion: Collection) {
  const cache = new Map<string, string[]>();
  return async (destino: string): Promise<string[]> => {
    const nombre = buscarDestino(destino)?.nombre;
    if (!nombre) return [];
    if (!cache.has(nombre)) {
      const { documents } = await coleccion.get({ where: { destino: nombre }, include: ['documents'] });
      cache.set(nombre, documents.filter((d): d is string => d !== null));
    }
    return cache.get(nombre)!;
  };
}
