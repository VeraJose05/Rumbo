// RNF-10: embeddings por la API REST de Cloudflare Workers AI (bge-m3, el mismo modelo del índice).
import { describe, expect, it } from 'vitest';
import { aPeticionEmbeddings, deRespuestaEmbeddings } from './embedder-remoto.js';

describe('aPeticionEmbeddings', () => {
  it('envía los textos de los documentos en el campo text', () => {
    expect(aPeticionEmbeddings(['tapas baratas', 'museos'])).toEqual({ text: ['tapas baratas', 'museos'] });
  });
});

describe('deRespuestaEmbeddings', () => {
  it('devuelve un embedding por texto, en el formato de Genkit', () => {
    const respuesta = { success: true, result: { shape: [2, 2], data: [[0.1, 0.2], [0.3, 0.4]], pooling: 'cls' } };
    expect(deRespuestaEmbeddings(respuesta, 2)).toEqual([{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }]);
  });

  it('falla con los errores de Cloudflare si la petición no tuvo éxito', () => {
    const respuesta = { success: false, errors: [{ code: 10000, message: 'Authentication error' }] };
    expect(() => deRespuestaEmbeddings(respuesta, 1)).toThrow(/Authentication error/);
  });

  it('falla si no llegan tantos vectores como textos', () => {
    const respuesta = { success: true, result: { data: [[0.1]] } };
    expect(() => deRespuestaEmbeddings(respuesta, 2)).toThrow();
  });
});
