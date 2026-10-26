// RNF-02: conexión con la base vectorial Chroma.
import { describe, expect, it } from 'vitest';
import { cargarConfigChroma } from './chroma.js';

describe('cargarConfigChroma', () => {
  it('usa Chroma en localhost:8000 y la colección destinos por defecto', () => {
    expect(cargarConfigChroma({})).toEqual({ host: 'localhost', port: 8000, ssl: false, coleccion: 'destinos' });
  });

  it('lee la URL y la colección del entorno', () => {
    expect(cargarConfigChroma({ CHROMA_URL: 'https://chroma.local:9000', CHROMA_COLECCION: 'pruebas' })).toEqual({
      host: 'chroma.local',
      port: 9000,
      ssl: true,
      coleccion: 'pruebas',
    });
  });

  it('rechaza una URL inválida', () => {
    expect(() => cargarConfigChroma({ CHROMA_URL: 'no-es-una-url' })).toThrow();
  });
});
