// RF-04, RF-06: prompt con fragmentos numerados y lectura de las citas de la respuesta.
import { describe, expect, it } from 'vitest';
import { construirPromptRag, extraerCitas } from './rag.js';

const fragmentos = [
  { texto: 'Los Coloniales es de altísima calidad.', seccion: 'Comer' },
  { texto: 'Sevilla tiene muchos bares.', seccion: 'Beber' },
];

describe('construirPromptRag', () => {
  it('numera los fragmentos con su destino y sección, y añade la pregunta al final', () => {
    const { prompt } = construirPromptRag('¿Dónde cenar tapas?', 'Sevilla', fragmentos);

    expect(prompt).toBe(
      [
        'Fragmentos:',
        '[1] (Sevilla › Comer) Los Coloniales es de altísima calidad.',
        '[2] (Sevilla › Beber) Sevilla tiene muchos bares.',
        '',
        'Pregunta: ¿Dónde cenar tapas?',
      ].join('\n'),
    );
  });

  it('pide responder solo con los fragmentos, citar y no inventar', () => {
    const { system } = construirPromptRag('¿Dónde cenar tapas?', 'Sevilla', fragmentos);

    expect(system).toMatch(/español/);
    expect(system).toMatch(/SOLO/);
    expect(system).toMatch(/\[2\]/);
    expect(system).toMatch(/no contienen/i);
  });
});

describe('extraerCitas', () => {
  it('devuelve los números citados, sin repetir y en orden', () => {
    expect(extraerCitas('Ve a Los Coloniales [2] o a la Alameda [1]. También [2].', 3)).toEqual([1, 2]);
  });

  it('entiende citas agrupadas como [1, 3] o [1][3]', () => {
    expect(extraerCitas('Hay bares [1, 3] y tapas [2][3].', 3)).toEqual([1, 2, 3]);
  });

  it('ignora números que no corresponden a ningún fragmento', () => {
    expect(extraerCitas('Según [0] y [7], y también [2].', 3)).toEqual([2]);
  });
});
