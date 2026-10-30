// RF-09 (C2): cliente del reranker. Un cross-encoder lee la consulta y cada fragmento juntos y les
// da una nota de relevancia: más preciso que comparar vectores, pero más lento, así que solo se
// aplica a los candidatos de la búsqueda híbrida. Lo sirve text-embeddings-inference (docker compose).

export type Reordenar = (consulta: string, textos: string[], k: number) => Promise<{ indice: number; puntuacion: number }[]>;

export function crearReranker(url: string, fetchFn: typeof fetch = fetch): Reordenar {
  return async (consulta, textos, k) => {
    if (!textos.length) return [];
    // truncate: los fragmentos más largos que la ventana del modelo se recortan en vez de dar error.
    const respuesta = await fetchFn(`${url}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: consulta, texts: textos, truncate: true }),
    });
    if (!respuesta.ok) {
      throw new Error(
        `El reranker respondió ${respuesta.status} (${await respuesta.text()}). ¿Está arrancado? docker compose up -d reranker`,
      );
    }
    const notas = (await respuesta.json()) as { index: number; score: number }[];
    return notas
      .map((n) => ({ indice: n.index, puntuacion: n.score }))
      .sort((a, b) => b.puntuacion - a.puntuacion)
      .slice(0, k);
  };
}
