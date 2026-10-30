// RF-04, RF-09 (C2): recuperación avanzada para una consulta. Junta la búsqueda vectorial (por
// significado) y BM25 (por palabras exactas) con RRF y deja que el reranker elija los k mejores.
import type { Reordenar } from '../modelos/reranker.js';
import { crearIndiceBm25 } from './bm25.js';
import { fusionarRrf } from './consultas.js';

export async function recuperarHibrido<T extends { id: string; texto: string }>({
  consulta,
  vectoriales,
  corpus,
  reordenar,
  k,
  candidatos,
}: {
  consulta: string;
  /** Resultado de la búsqueda vectorial, de más a menos parecido. */
  vectoriales: T[];
  /** Todos los fragmentos del destino, para BM25. */
  corpus: T[];
  reordenar: Reordenar;
  k: number;
  /** Cuántos candidatos de la fusión pasan al reranker: más da más opciones, pero tarda más. */
  candidatos: number;
}): Promise<(T & { puntuacionReranker: number })[]> {
  const porId = new Map(corpus.map((f) => [f.id, f]));
  const lexicos = crearIndiceBm25(corpus)
    .buscar(consulta, candidatos)
    .map((r) => porId.get(r.id)!);

  const fusionados = fusionarRrf([vectoriales, lexicos], candidatos);
  if (!fusionados.length) return [];

  const elegidos = await reordenar(consulta, fusionados.map((f) => f.texto), k);
  return elegidos.map(({ indice, puntuacion }) => ({ ...fusionados[indice]!, puntuacionReranker: puntuacion }));
}
