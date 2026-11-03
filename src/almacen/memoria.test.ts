// RNF-10: índice vectorial en memoria, para desplegar sin Chroma.
import { describe, expect, it } from 'vitest';
import { crearAlmacenMemoria, distanciaCoseno, type RegistroIndice } from './memoria.js';

describe('distanciaCoseno', () => {
  it('es 0 para vectores con el mismo sentido, aunque tengan distinta longitud', () => {
    expect(distanciaCoseno([1, 2], [2, 4])).toBeCloseTo(0);
  });

  it('es 1 para vectores perpendiculares y 2 para opuestos', () => {
    expect(distanciaCoseno([1, 0], [0, 1])).toBeCloseTo(1);
    expect(distanciaCoseno([1, 0], [-1, 0])).toBeCloseTo(2);
  });
});

const registros: RegistroIndice[] = [
  { id: 's1', texto: 'Catedral', metadata: { destino: 'Sevilla' }, embedding: [1, 0] },
  { id: 's2', texto: 'Triana', metadata: { destino: 'Sevilla' }, embedding: [0.7, 0.7] },
  { id: 's3', texto: 'Tapas', metadata: { destino: 'Sevilla' }, embedding: [0, 1] },
  { id: 'm1', texto: 'Prado', metadata: { destino: 'Madrid' }, embedding: [1, 0] },
];

describe('crearAlmacenMemoria', () => {
  const almacen = crearAlmacenMemoria(registros);

  it('devuelve los n fragmentos más cercanos del destino, ordenados por distancia', async () => {
    const resultado = await almacen.buscar([1, 0.1], 2, 'Sevilla');
    expect(resultado.map((f) => f.id)).toEqual(['s1', 's2']);
    expect(resultado[0]!.distancia).toBeLessThan(resultado[1]!.distancia!);
  });

  it('no mezcla fragmentos de otros destinos', async () => {
    const resultado = await almacen.buscar([1, 0], 10, 'Madrid');
    expect(resultado.map((f) => f.id)).toEqual(['m1']);
  });

  it('lista todos los fragmentos de un destino (lo necesita BM25)', async () => {
    expect((await almacen.fragmentos('Sevilla')).map((f) => f.id)).toEqual(['s1', 's2', 's3']);
  });
});
