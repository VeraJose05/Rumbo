// RF-04, RF-06: prompt con fragmentos numerados y comprobación de las citas.
import { describe, expect, it } from 'vitest';
import { citasValidas, construirPromptRag, verificarRecomendacion } from './rag.js';

const fragmentos = [
  { texto: 'Los Coloniales es de altísima calidad.', seccion: 'Comer' },
  { texto: 'Sevilla tiene muchos bares.', seccion: 'Beber' },
];

describe('construirPromptRag', () => {
  it('numera los fragmentos con su destino y sección, y añade la pregunta al final', () => {
    const { prompt } = construirPromptRag('¿Dónde cenar tapas?', 'Sevilla', fragmentos);

    expect(prompt).toBe(
      [
        'Textos:',
        '[1] (Sevilla › Comer) Los Coloniales es de altísima calidad.',
        '[2] (Sevilla › Beber) Sevilla tiene muchos bares.',
        '',
        'Pregunta: ¿Dónde cenar tapas?',
      ].join('\n'),
    );
  });

  it('pide responder solo con los textos, citar y decir con naturalidad cuándo no hay información', () => {
    const { system } = construirPromptRag('¿Dónde cenar tapas?', 'Sevilla', fragmentos);

    expect(system).toMatch(/español/);
    expect(system).toMatch(/SOLO/);
    expect(system).toMatch(/citas/);
    expect(system).toMatch(/No tengo información sobre … en Sevilla/);
  });
});

describe('citasValidas', () => {
  it('quita repetidas y números que no corresponden a ningún fragmento, y las ordena', () => {
    expect(citasValidas([3, 0, 1, 3, 7], 5)).toEqual([1, 3]);
  });
});

describe('verificarRecomendacion', () => {
  const textos = ['* Torre del Oro - Torre vigía del siglo XIII.', 'El serranito es un bocadillo de lomo.'];

  it('acepta un lugar cuyo nombre aparece en los textos citados', () => {
    expect(verificarRecomendacion('Torre del Oro', textos)).toBe(true);
  });

  it('ignora mayúsculas, tildes y palabras vacías', () => {
    expect(verificarRecomendacion('El Serranito', textos)).toBe(true);
    expect(verificarRecomendacion('TORRE DEL ORO', textos)).toBe(true);
    expect(verificarRecomendacion('Alcázar', ['El alcazar es árabe.'])).toBe(true);
  });

  it('rechaza un lugar que no aparece en los textos citados', () => {
    expect(verificarRecomendacion('Reales Alcázares', textos)).toBe(false);
  });

  it('rechaza una recomendación sin textos citados', () => {
    expect(verificarRecomendacion('Torre del Oro', [])).toBe(false);
  });
});
