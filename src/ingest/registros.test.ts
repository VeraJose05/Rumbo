// RF-03, RNF-07: registros que se guardan en la base vectorial.
import { describe, expect, it } from 'vitest';
import { crearRegistros } from './registros.js';

const articulo = {
  destino: 'Sevilla',
  url: 'https://es.wikivoyage.org/wiki/Sevilla',
  revision: 248409,
  fechaDescarga: '2026-10-26',
};

describe('crearRegistros', () => {
  it('crea un registro por fragmento con id estable, texto, texto para el embedding y metadatos', () => {
    const fragmentos = [
      { seccion: ['Introducción'], texto: 'Sevilla es la capital.' },
      { seccion: ['Pasear', 'En taxi'], texto: 'Hay muchos taxis.' },
    ];

    expect(crearRegistros(articulo, fragmentos)).toEqual([
      {
        id: 'wikivoyage:Sevilla:0',
        documento: 'Sevilla es la capital.',
        textoEmbedding: 'Sevilla › Introducción: Sevilla es la capital.',
        metadatos: {
          destino: 'Sevilla',
          fuente: 'Wikivoyage',
          licencia: 'CC BY-SA 4.0',
          url: 'https://es.wikivoyage.org/wiki/Sevilla',
          seccion: 'Introducción',
          revision: 248409,
          fechaDescarga: '2026-10-26',
        },
      },
      {
        id: 'wikivoyage:Sevilla:1',
        documento: 'Hay muchos taxis.',
        textoEmbedding: 'Sevilla › Pasear › En taxi: Hay muchos taxis.',
        metadatos: expect.objectContaining({ seccion: 'Pasear › En taxi' }),
      },
    ]);
  });
});
