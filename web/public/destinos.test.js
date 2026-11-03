// RF-12: datos de los destinos de la portada y su navegación como historias.
import { describe, expect, it } from 'vitest';
import { DESTINOS_PORTADA, creditoFoto, otraHistoria } from './destinos.js';

describe('DESTINOS_PORTADA', () => {
  it('tiene los cinco destinos con guía, cada uno con su foto y su crédito', () => {
    expect(DESTINOS_PORTADA.map((d) => d.nombre)).toEqual(['Sevilla', 'Granada', 'Madrid', 'Barcelona', 'Valencia']);
    for (const d of DESTINOS_PORTADA) {
      expect(d.foto).toMatch(/^fotos\/destinos\/.+\.webp$/);
      expect(d.credito.autor).toBeTruthy();
      expect(d.credito.licencia).toMatch(/^CC/);
    }
  });
});

describe('otraHistoria', () => {
  it('avanza y retrocede', () => {
    expect(otraHistoria(1, 5, +1)).toBe(2);
    expect(otraHistoria(1, 5, -1)).toBe(0);
  });

  it('da la vuelta en los extremos', () => {
    expect(otraHistoria(4, 5, +1)).toBe(0);
    expect(otraHistoria(0, 5, -1)).toBe(4);
  });
});

describe('creditoFoto', () => {
  it('cita autor y licencia, como exige CC BY-SA', () => {
    expect(creditoFoto({ autor: 'Berthold Werner', licencia: 'CC BY-SA 3.0' })).toBe('Foto: Berthold Werner · CC BY-SA 3.0');
  });
});
