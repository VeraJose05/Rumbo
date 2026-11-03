// RF-04: adaptador de la colección de Chroma a la interfaz Almacen.
import type { Collection } from 'chromadb';
import type { Almacen } from './almacen.js';

export function almacenChroma(coleccion: Collection): Almacen {
  return {
    async buscar(vector, n, destino) {
      const resultado = await coleccion.query({ queryEmbeddings: [vector], nResults: n, where: { destino } });
      return (resultado.rows()[0] ?? []).map((f) => ({
        id: f.id,
        texto: f.document ?? '',
        metadata: { ...f.metadata },
        distancia: f.distance ?? undefined,
      }));
    },
    async fragmentos(destino) {
      const resultado = await coleccion.get({ where: { destino }, include: ['documents', 'metadatas'] });
      return resultado.rows().map((f) => ({ id: f.id, texto: f.document ?? '', metadata: { ...f.metadata } }));
    },
  };
}
