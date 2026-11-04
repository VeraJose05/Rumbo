// RF-14: el planificador da por situable lo que el mapa sabe situar.
import { describe, expect, it } from 'vitest';
import { cargarSituar, crearSituar } from './coordenadas.js';

const situar = crearSituar({ Sevilla: { lugares: [{ nombre: 'Reales Alcázares', seccion: 'Ver', lat: 37.38, lon: -5.99 }] } });

describe('crearSituar', () => {
  it('sitúa el lugar si está entre los que tienen coordenadas', () => {
    expect(situar('Reales Alcázares de Sevilla', 'Sevilla')).toEqual({ lat: 37.38, lon: -5.99 });
  });

  it('no sitúa lo que no está («Bares de Nervión»)', () => {
    expect(situar('Bares de Nervión', 'Sevilla')).toBeNull();
  });

  it('una zona o un grupo no es un sitio aunque nombre un barrio («Bares de Nervión», «Zona de copas»)', () => {
    const conBarrio = crearSituar({ Sevilla: { lugares: [{ nombre: 'Nervión', seccion: 'Ver › Barrios', lat: 37.38, lon: -5.97 }] } });
    expect(conBarrio('Bares de Nervión', 'Sevilla')).toBeNull();
    expect(conBarrio('Restaurantes de Nervión', 'Sevilla')).toBeNull();
    expect(conBarrio('Zona de Nervión', 'Sevilla')).toBeNull();
    expect(conBarrio('Nervión', 'Sevilla')).not.toBeNull();
  });

  it('un destino sin coordenadas no filtra nada (punto desconocido, que no coincide con ninguno)', () => {
    const punto = situar('Cualquier sitio', 'Toledo');
    expect(punto).not.toBeNull();
    expect(Number.isNaN(punto!.lat)).toBe(true);
  });
});

describe('cargarSituar', () => {
  it('sin el archivo de coordenadas no hay filtro', () => {
    expect(cargarSituar('/no/existe.json')).toBeUndefined();
  });

  it('con el archivo del repositorio sitúa la Giralda', () => {
    expect(cargarSituar()?.('Giralda', 'Sevilla')).not.toBeNull();
  });
});
