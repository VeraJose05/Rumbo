// RF-03: descarga de artículos de Wikivoyage en español.
import { describe, expect, it } from 'vitest';
import { leerRespuestaParse, urlArticulo } from './wikivoyage.js';

describe('urlArticulo', () => {
  it('construye la URL pública del artículo con guiones bajos en lugar de espacios', () => {
    expect(urlArticulo('Sevilla')).toBe('https://es.wikivoyage.org/wiki/Sevilla');
    expect(urlArticulo('San Sebastián')).toBe('https://es.wikivoyage.org/wiki/San_Sebasti%C3%A1n');
  });
});

describe('leerRespuestaParse', () => {
  it('extrae título, wikitexto y revisión de la respuesta de la API', () => {
    const respuesta = { parse: { title: 'Sevilla', revid: 248409, wikitext: '== Ver ==' } };

    expect(leerRespuestaParse(respuesta)).toEqual({ titulo: 'Sevilla', revision: 248409, wikitexto: '== Ver ==' });
  });

  it('lanza un error claro si el artículo no existe', () => {
    const respuesta = { error: { code: 'missingtitle', info: "The page you specified doesn't exist." } };

    expect(() => leerRespuestaParse(respuesta)).toThrow(/missingtitle/);
  });
});
