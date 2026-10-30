// RF-09 (C2): cliente del reranker (text-embeddings-inference), probado con un fetch simulado.
import { describe, expect, it } from 'vitest';
import { crearReranker } from './reranker.js';

function fetchSimulado(respuesta: unknown, ok = true) {
  const llamadas: { url: string; cuerpo: unknown }[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), cuerpo: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(respuesta), { status: ok ? 200 : 503 });
  };
  return { fn: fn as typeof fetch, llamadas };
}

describe('crearReranker', () => {
  it('envía la consulta y los textos a /rerank y devuelve los k mejores, de mayor a menor', async () => {
    const { fn, llamadas } = fetchSimulado([
      { index: 2, score: 0.91 },
      { index: 0, score: 0.4 },
      { index: 1, score: 0.02 },
    ]);
    const reordenar = crearReranker('http://localhost:8080', fn);

    const resultado = await reordenar('playas', ['a', 'b', 'c'], 2);

    expect(llamadas).toEqual([{ url: 'http://localhost:8080/rerank', cuerpo: { query: 'playas', texts: ['a', 'b', 'c'], truncate: true } }]);
    expect(resultado).toEqual([
      { indice: 2, puntuacion: 0.91 },
      { indice: 0, puntuacion: 0.4 },
    ]);
  });

  it('ordena aunque el servicio no devuelva la lista ordenada', async () => {
    const { fn } = fetchSimulado([
      { index: 0, score: 0.1 },
      { index: 1, score: 0.8 },
    ]);
    expect((await crearReranker('http://x', fn)('q', ['a', 'b'], 5)).map((r) => r.indice)).toEqual([1, 0]);
  });

  it('sin textos no llama al servicio', async () => {
    const { fn, llamadas } = fetchSimulado([]);
    expect(await crearReranker('http://x', fn)('q', [], 5)).toEqual([]);
    expect(llamadas).toHaveLength(0);
  });

  it('lanza un error claro si el servicio no responde bien', async () => {
    const { fn } = fetchSimulado({ error: 'Model is loading' }, false);
    await expect(crearReranker('http://x', fn)('q', ['a'], 1)).rejects.toThrow('docker compose up -d reranker');
  });
});
