// RF-04: recuperador de Genkit sobre Chroma: embedding de la pregunta y top-k del destino.
import type { Collection } from 'chromadb';
import { Document, type Genkit } from 'genkit';
import type { Reordenar } from '../modelos/reranker.js';
import { recuperarHibrido } from './hibrido.js';
import { OpcionesRecuperacionSchema } from './pregunta.js';

export function definirRecuperadorChroma(ai: Genkit, coleccion: Collection, embedder: string) {
  return ai.defineRetriever(
    { name: 'chroma/destinos', configSchema: OpcionesRecuperacionSchema },
    async (consulta, { k, destino }) => {
      const [vector] = await ai.embed({ embedder, content: consulta.text });
      const resultado = await coleccion.query({
        queryEmbeddings: [vector!.embedding],
        nResults: k,
        where: { destino },
      });
      const documentos = (resultado.rows()[0] ?? []).map((fila) =>
        // La distancia se guarda para poder estudiar umbrales (RF-07) en las trazas.
        Document.fromText(fila.document ?? '', { ...fila.metadata, id: fila.id, distancia: fila.distance }),
      );
      return { documents: documentos };
    },
  );
}

/** Candidatos que pasan de la búsqueda híbrida al reranker en cada consulta (C2). */
const CANDIDATOS_HIBRIDO = 20;

// RF-09 (C2): recuperador avanzado: vectorial + BM25 sobre toda la guía del destino, fusionados
// con RRF y reordenados por el cross-encoder.
export function definirRecuperadorHibrido(ai: Genkit, coleccion: Collection, embedder: string, reordenar: Reordenar) {
  type Fragmento = { id: string; texto: string; metadata: Record<string, unknown> };
  // La guía de cada destino se lee una vez: BM25 necesita todos sus fragmentos.
  const corpus = new Map<string, Fragmento[]>();
  const corpusDe = async (destino: string) => {
    if (!corpus.has(destino)) {
      const resultado = await coleccion.get({ where: { destino }, include: ['documents', 'metadatas'] });
      corpus.set(
        destino,
        resultado.rows().map((f) => ({ id: f.id, texto: f.document ?? '', metadata: { ...f.metadata, id: f.id } })),
      );
    }
    return corpus.get(destino)!;
  };

  return ai.defineRetriever(
    { name: 'chroma/hibrido', configSchema: OpcionesRecuperacionSchema },
    async (consulta, { k, destino }) => {
      const [vector] = await ai.embed({ embedder, content: consulta.text });
      const resultado = await coleccion.query({ queryEmbeddings: [vector!.embedding], nResults: CANDIDATOS_HIBRIDO, where: { destino } });
      const vectoriales = (resultado.rows()[0] ?? []).map((f) => ({
        id: f.id,
        texto: f.document ?? '',
        metadata: { ...f.metadata, id: f.id, distancia: f.distance },
      }));
      const elegidos = await recuperarHibrido({
        consulta: consulta.text,
        vectoriales,
        corpus: await corpusDe(destino),
        reordenar,
        k,
        candidatos: CANDIDATOS_HIBRIDO,
      });
      return {
        documents: elegidos.map((f) => Document.fromText(f.texto, { ...f.metadata, puntuacionReranker: f.puntuacionReranker })),
      };
    },
  );
}
