// RF-03: limpieza del wikitexto de Wikivoyage.
import { describe, expect, it } from 'vitest';
import { limpiarWikitexto } from './wikitexto.js';

describe('limpiarWikitexto', () => {
  it('deja solo el texto visible de un enlace interno', () => {
    const entrada = 'con la caída del [[w:Califato de Córdoba|Califato]] esto cambió';
    const esperado = 'con la caída del Califato esto cambió';

    expect(limpiarWikitexto(entrada)).toBe(esperado);
  });

  it('deja solo el texto visible de un enlace sin barra', () => {
    const entrada = 'es la capital de [[Andalucía]]';
    const esperado = 'es la capital de Andalucía';

    expect(limpiarWikitexto(entrada)).toBe(esperado);
  });

  it('quita negritas y cursivas', () => {
    expect(limpiarWikitexto("'''Catedral de Sevilla''' y ''El Giraldillo''")).toBe(
      'Catedral de Sevilla y El Giraldillo',
    );
  });

  it('elimina imágenes, aunque su pie lleve enlaces', () => {
    const entrada = 'Antes\n[[Archivo:Giralda.jpg|thumb|250px|La [[Giralda]] de noche]]\nDespués';
    expect(limpiarWikitexto(entrada)).toBe('Antes\n\nDespués');
  });

  it('elimina las categorías', () => {
    expect(limpiarWikitexto('Texto [[Categoría:Sevilla]]')).toBe('Texto');
  });

  it('deja el texto de los enlaces externos y quita los que no tienen texto', () => {
    expect(limpiarWikitexto('[https://sevici.es Sevici] y [http://www.sevici.es/]')).toBe('Sevici y');
  });

  it('elimina las referencias', () => {
    expect(limpiarWikitexto('Hay trenes<ref>http://renfe.com</ref> cada hora.\n<references/>')).toBe(
      'Hay trenes cada hora.',
    );
  });

  it('convierte las entidades HTML', () => {
    expect(limpiarWikitexto('702&nbsp;355 habitantes &amp; más')).toBe('702 355 habitantes & más');
  });

  it('conserva la introducción de la plantilla top', () => {
    expect(limpiarWikitexto("{{top|intro= '''Sevilla''' es la capital de [[Andalucía]].}}")).toBe(
      'Sevilla es la capital de Andalucía.',
    );
  });

  it('convierte los listados en nombre, dirección y descripción', () => {
    const entrada = `{{dormir
| nombre=Hotel Pasarela | url=http://hotelpasarela.com | dirección= Avenida De La Borbolla, 11
| tlf=954 415 511 | descripción= Hotel de 4 estrellas junto a la Plaza de España.
}}`;
    expect(limpiarWikitexto(entrada)).toBe(
      'Hotel Pasarela (Avenida De La Borbolla, 11): Hotel de 4 estrellas junto a la Plaza de España.',
    );
  });

  it('omite las partes vacías de un listado', () => {
    expect(limpiarWikitexto('{{listado | nombre = Bar Pepe | dirección= | descripción= }}')).toBe('Bar Pepe');
  });

  it('elimina el resto de plantillas', () => {
    expect(limpiarWikitexto('Texto\n{{geo|37.37|-5.98}}\n{{Clima\n|enemax=15,9\n}}')).toBe('Texto');
  });

  it('elimina las tablas, que en Wikivoyage son horarios y tarifas', () => {
    const entrada = 'Precios:\n{| class="wikitable"\n|-\n| Sencillo || 1,50 €\n|}\nDespués';
    expect(limpiarWikitexto(entrada)).toBe('Precios:\n\nDespués');
  });

  it('quita las etiquetas HTML conservando su texto, salvo los superíndices de notas', () => {
    expect(limpiarWikitexto('* <big>Alhambra.</big> Abre<br/>a las 8<small> (aprox.)</small>')).toBe(
      '* Alhambra. Abre a las 8 (aprox.)',
    );
    expect(limpiarWikitexto('del Señor<sup>2</sup>.')).toBe('del Señor.');
    expect(limpiarWikitexto('C/ Olmo, 31 <metro> Antón Martín')).toBe('C/ Olmo, 31 Antón Martín');
  });

  it('conserva títulos de sección y viñetas, y compacta las líneas en blanco', () => {
    const entrada = '== Ver ==\n\n\n\n* Catedral   \n* Giralda';
    expect(limpiarWikitexto(entrada)).toBe('== Ver ==\n\n* Catedral\n* Giralda');
  });
});
