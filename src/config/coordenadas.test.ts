// RF-14: el planificador da por situable lo que el mapa sabe situar.
import { describe, expect, it } from 'vitest';
import { cargarLocalizable, crearLocalizable } from './coordenadas.js';

const localizable = crearLocalizable({ Sevilla: { lugares: [{ nombre: 'Reales Alcázares', seccion: 'Ver', lat: 37.38, lon: -5.99 }] } });

describe('crearLocalizable', () => {
  it('sitúa el lugar si está entre los que tienen coordenadas', () => {
    expect(localizable('Reales Alcázares de Sevilla', 'Sevilla')).toBe(true);
  });

  it('no sitúa lo que no está («Bares de Nervión»)', () => {
    expect(localizable('Bares de Nervión', 'Sevilla')).toBe(false);
  });

  it('una zona o un grupo no es un sitio aunque nombre un barrio («Bares de Nervión», «Zona de copas»)', () => {
    const conBarrio = crearLocalizable({ Sevilla: { lugares: [{ nombre: 'Nervión', seccion: 'Ver › Barrios', lat: 37.38, lon: -5.97 }] } });
    expect(conBarrio('Bares de Nervión', 'Sevilla')).toBe(false);
    expect(conBarrio('Restaurantes de Nervión', 'Sevilla')).toBe(false);
    expect(conBarrio('Zona de Nervión', 'Sevilla')).toBe(false);
    expect(conBarrio('Nervión', 'Sevilla')).toBe(true);
  });

  it('un destino sin coordenadas no filtra nada', () => {
    expect(localizable('Cualquier sitio', 'Toledo')).toBe(true);
  });
});

describe('cargarLocalizable', () => {
  it('sin el archivo de coordenadas no hay filtro', () => {
    expect(cargarLocalizable('/no/existe.json')).toBeUndefined();
  });

  it('con el archivo del repositorio sitúa la Giralda', () => {
    expect(cargarLocalizable()?.('Giralda', 'Sevilla')).toBe(true);
  });
});
