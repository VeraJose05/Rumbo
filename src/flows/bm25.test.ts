// RF-04, RF-09 (C2): búsqueda por palabras clave con BM25 sobre los fragmentos de un destino.
import { describe, expect, it } from 'vitest';
import { crearIndiceBm25 } from './bm25.js';

const fragmentos = [
  { id: 'playa', texto: 'La playa de la Malvarrosa es la más popular. Playa ancha y con paseo.' },
  { id: 'rio', texto: 'El río Turia se convirtió en un gran jardín para pasear.' },
  { id: 'alcazar', texto: 'El Alcázar es un palacio con jardines de estilo árabe.' },
  { id: 'largo', texto: `Jardín botánico. ${'Información general sobre horarios y precios. '.repeat(20)}` },
];

describe('crearIndiceBm25', () => {
  const indice = crearIndiceBm25(fragmentos);

  it('devuelve antes los fragmentos que contienen las palabras de la consulta', () => {
    expect(indice.buscar('playas y playa para bañarse', 4).map((r) => r.id)).toEqual(['playa']);
  });

  it('ignora mayúsculas, tildes y palabras vacías', () => {
    expect(indice.buscar('ALCAZAR', 4).map((r) => r.id)).toEqual(['alcazar']);
    // «de», «la» y «el» están en casi todos: no deben bastar para devolver nada.
    expect(indice.buscar('de la el', 4)).toEqual([]);
  });

  it('a igualdad de palabras, el fragmento corto puntúa más que el largo', () => {
    const ids = indice.buscar('jardín', 4).map((r) => r.id);
    expect(ids.indexOf('rio')).toBeLessThan(ids.indexOf('largo'));
  });

  it('las palabras raras pesan más que las comunes', () => {
    // «jardines» solo sale en el Alcázar; «jardín», en dos fragmentos.
    expect(indice.buscar('jardín jardines', 4)[0]?.id).toBe('alcazar');
  });

  it('devuelve como mucho k resultados, ordenados de mayor a menor puntuación', () => {
    const resultados = indice.buscar('jardín palacio playa río', 2);
    expect(resultados).toHaveLength(2);
    expect(resultados[0]!.puntuacion).toBeGreaterThanOrEqual(resultados[1]!.puntuacion);
  });

  it('sin fragmentos no devuelve nada', () => {
    expect(crearIndiceBm25([]).buscar('playa', 5)).toEqual([]);
  });
});
