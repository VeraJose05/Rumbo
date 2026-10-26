// RF-03, RF-04: acceso a la colección de Chroma donde se guardan los fragmentos.
import { ChromaClient, type Collection } from 'chromadb';
import type { ConfigChroma } from '../config/chroma.js';

export async function abrirColeccion(config: ConfigChroma): Promise<Collection> {
  const cliente = new ChromaClient({ host: config.host, port: config.port, ssl: config.ssl });
  return cliente.getOrCreateCollection({
    name: config.coleccion,
    // Los embeddings los calculamos nosotros con Ollama, así que Chroma no necesita su propio modelo.
    embeddingFunction: null,
    // Distancia coseno, la misma del experimento de similitud (por defecto Chroma usa la euclídea).
    configuration: { hnsw: { space: 'cosine' } },
  });
}
