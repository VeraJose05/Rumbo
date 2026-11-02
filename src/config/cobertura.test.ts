// RF-07: intereses que la guía de un destino no cubre.
import { describe, expect, it } from 'vitest';
import { sinCobertura, UMBRAL_COBERTURA } from './cobertura.js';

const notas = { Sevilla: { playa: 0.023, monumentos: 0.637 }, Valencia: { playa: 0.056 } };

describe('sinCobertura', () => {
  it('devuelve los intereses con nota por debajo del umbral', () => {
    expect(sinCobertura('Sevilla', ['monumentos', 'playa'], notas)).toEqual(['playa']);
  });

  it('el umbral es conservador: Valencia-playa (0,056) cuenta como cubierto', () => {
    // En el experimento, Valencia tiene la sección «Playas» y aun así el reranker le dio 0,056.
    expect(UMBRAL_COBERTURA).toBeLessThan(0.056);
    expect(sinCobertura('Valencia', ['playa'], notas)).toEqual([]);
  });

  it('sin datos del destino o del interés, lo da por cubierto', () => {
    expect(sinCobertura('Bilbao', ['playa'], notas)).toEqual([]);
    expect(sinCobertura('Sevilla', ['compras'], notas)).toEqual([]);
  });
});
