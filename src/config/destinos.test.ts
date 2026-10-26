// RF-03: catálogo de destinos con guía en el corpus.
import { describe, expect, it } from 'vitest';
import { buscarDestino, DESTINOS } from './destinos.js';

describe('buscarDestino', () => {
  it('encuentra el destino y su artículo de Wikivoyage', () => {
    expect(buscarDestino('Granada')).toEqual({ nombre: 'Granada', articulo: 'Granada (España)' });
  });

  it('ignora mayúsculas, tildes y espacios', () => {
    expect(buscarDestino('  sevilla ')?.nombre).toBe('Sevilla');
    expect(buscarDestino('VALENCIA')?.nombre).toBe('Valencia');
  });

  it('devuelve undefined si el destino no tiene guía', () => {
    expect(buscarDestino('Bilbao')).toBeUndefined();
  });
});

describe('DESTINOS', () => {
  it('incluye los cinco destinos iniciales del plan', () => {
    expect(DESTINOS.map((d) => d.nombre)).toEqual(['Sevilla', 'Madrid', 'Barcelona', 'Granada', 'Valencia']);
  });
});
