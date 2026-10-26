// RF-04: recuperador de Genkit sobre Chroma: embedding de la pregunta y top-k del destino.
import type { Collection } from 'chromadb';
import { Document, type Genkit } from 'genkit';
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
