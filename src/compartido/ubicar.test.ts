// RF-14: distancia entre lugares (para no repetir el mismo sitio con otro nombre).
import { describe, expect, it } from 'vitest';
import { distanciaMetros } from './ubicar.js';

describe('distanciaMetros', () => {
  it('la Catedral según Wikidata y según OpenStreetMap son el mismo sitio (a unos metros)', () => {
    expect(distanciaMetros({ lat: 37.3858, lon: -5.9931 }, { lat: 37.38591, lon: -5.99314 })).toBeLessThan(30);
  });

  it('la Giralda está a unos 50 m del centro de la Catedral: son sitios distintos', () => {
    expect(distanciaMetros({ lat: 37.3862, lon: -5.9926 }, { lat: 37.3858, lon: -5.9931 })).toBeGreaterThan(30);
  });
});
