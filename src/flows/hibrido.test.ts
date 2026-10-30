// RF-04, RF-09 (C2): recuperación avanzada: búsqueda híbrida (vectorial + BM25) y reranking.
import { describe, expect, it } from 'vitest';
import type { Reordenar } from '../modelos/reranker.js';
import { recuperarHibrido } from './hibrido.js';

const frag = (id: string, texto: string) => ({ id, texto });

const corpus = [
  frag('rio', 'Paseo junto al río Guadalquivir.'),
  frag('playa', 'Las playas de Huelva y Cádiz están a una hora.'),
  frag('bares', 'Bares de tapas en Triana.'),
  frag('parque', 'El Parque de María Luisa es enorme.'),
];

/** Reranker simulado: puntúa según el orden de preferencia indicado y anota qué recibió. */
function rerankerSimulado(preferencia: string[]) {
  const recibidos: string[][] = [];
  const reordenar: Reordenar = async (_consulta, textos, k) => {
    recibidos.push(textos);
    return textos
      .map((t, indice) => ({ indice, puntuacion: -preferencia.findIndex((id) => corpus.find((f) => f.id === id)?.texto === t) }))
      .sort((a, b) => b.puntuacion - a.puntuacion)
      .slice(0, k);
  };
  return { reordenar, recibidos };
}

describe('recuperarHibrido', () => {
  it('añade a los candidatos vectoriales los que encuentra BM25 por palabra exacta', async () => {
    const { reordenar, recibidos } = rerankerSimulado(['playa', 'rio', 'parque', 'bares']);
    // La vectorial no encuentra la playa; BM25 sí, por la palabra «playas».
    const vectoriales = [corpus[0]!, corpus[3]!];

    await recuperarHibrido({ consulta: 'playas para bañarse', vectoriales, corpus, reordenar, k: 2, candidatos: 10 });

    expect(recibidos[0]).toContain('Las playas de Huelva y Cádiz están a una hora.');
  });

  it('devuelve los k que el reranker pone primero, con su puntuación', async () => {
    const { reordenar } = rerankerSimulado(['playa', 'parque', 'rio', 'bares']);

    const resultado = await recuperarHibrido({
      consulta: 'playas',
      vectoriales: [corpus[0]!, corpus[3]!],
      corpus,
      reordenar,
      k: 2,
      candidatos: 10,
    });

    expect(resultado.map((r) => r.id)).toEqual(['playa', 'parque']);
    expect(resultado[0]).toHaveProperty('puntuacionReranker');
  });

  it('pasa al reranker como mucho el número de candidatos indicado', async () => {
    const { reordenar, recibidos } = rerankerSimulado([]);

    await recuperarHibrido({ consulta: 'río playas tapas parque', vectoriales: corpus, corpus, reordenar, k: 1, candidatos: 3 });

    expect(recibidos[0]).toHaveLength(3);
  });

  it('sin candidatos no llama al reranker (destino fuera del corpus)', async () => {
    const { reordenar, recibidos } = rerankerSimulado([]);

    expect(await recuperarHibrido({ consulta: 'playas', vectoriales: [], corpus: [], reordenar, k: 2, candidatos: 10 })).toEqual([]);
    expect(recibidos).toHaveLength(0);
  });
});
