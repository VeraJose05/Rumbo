// RF-03: troceado de un artículo limpio en fragmentos por sección.
import { describe, expect, it } from 'vitest';
import { trocearArticulo } from './troceado.js';

const opciones = { maxPalabras: 10, seccionesDescartadas: [] };

describe('trocearArticulo', () => {
  it('crea un fragmento por sección con su ruta, y llama Introducción al texto inicial', () => {
    const texto = 'Sevilla es la capital.\n\n== Comprender ==\nHistoria larga.\n\n=== Clima ===\nHace calor.';

    expect(trocearArticulo(texto, opciones)).toEqual([
      { seccion: ['Introducción'], texto: 'Sevilla es la capital.' },
      { seccion: ['Comprender'], texto: 'Historia larga.' },
      { seccion: ['Comprender', 'Clima'], texto: 'Hace calor.' },
    ]);
  });

  it('no crea fragmentos para secciones sin texto propio', () => {
    const texto = '== Llegar ==\n\n=== En tren ===\nHay AVE.';

    expect(trocearArticulo(texto, opciones)).toEqual([{ seccion: ['Llegar', 'En tren'], texto: 'Hay AVE.' }]);
  });

  it('descarta las secciones indicadas junto con sus subsecciones', () => {
    const texto = '== Ver ==\nLa Giralda.\n\n== Dormir ==\nHay hoteles.\n\n=== Hoteles ===\nHotel Lobby.';

    const fragmentos = trocearArticulo(texto, { ...opciones, seccionesDescartadas: ['Dormir'] });

    expect(fragmentos).toEqual([{ seccion: ['Ver'], texto: 'La Giralda.' }]);
  });

  it('agrupa párrafos y viñetas consecutivos sin pasar del máximo de palabras', () => {
    const texto = [
      '== Ver ==',
      '* Catedral de Sevilla, gótica.', // 4 palabras (la viñeta no cuenta)
      '* La Giralda, antiguo minarete.', // 4
      '* Torre del Oro, siglo XIII.', // 5
      '',
      'Plaza de España, junto al parque.', // 6
    ].join('\n');

    expect(trocearArticulo(texto, opciones).map((f) => f.texto)).toEqual([
      '* Catedral de Sevilla, gótica.\n* La Giralda, antiguo minarete.',
      '* Torre del Oro, siglo XIII.',
      'Plaza de España, junto al parque.',
    ]);
  });

  it('parte por frases un párrafo más largo que el máximo', () => {
    const texto = '== Comprender ==\nUna frase de cinco palabras. Otra frase también con cinco. Y una tercera más corta.';

    expect(trocearArticulo(texto, opciones).map((f) => f.texto)).toEqual([
      'Una frase de cinco palabras. Otra frase también con cinco.',
      'Y una tercera más corta.',
    ]);
  });
});
