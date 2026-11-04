// RF-03, RF-14: lugares de Wikipedia (vía Wikidata) como segunda fuente del corpus.
import { describe, expect, it } from 'vitest';
import { esLugarVisitable, lugaresDeSparql, recortarExtracto, registroDeLugar, seccionDeTipos, type LugarWikidata } from './wikidata.js';

describe('esLugarVisitable', () => {
  it('acepta monumentos, museos, parques, plazas, barrios y mercados', () => {
    for (const tipos of [['iglesia'], ['museo de arte'], ['parque urbano'], ['plaza'], ['barrio'], ['mercado'], ['palacio', 'monumento'], ['complejo arquitectónico'], ['rambla']]) {
      expect(esLugarVisitable(tipos), tipos.join()).toBe(true);
    }
  });

  it('descarta lo que no es un sitio que visitar (estaciones, municipios, eventos, hospitales)', () => {
    for (const tipos of [['estación de metro'], ['municipio de España'], ['campeonato mundial'], ['hospital'], ['temporada deportiva'], []]) {
      expect(esLugarVisitable(tipos), tipos.join()).toBe(false);
    }
  });

  it('una estación que además es monumento sigue siendo una estación', () => {
    expect(esLugarVisitable(['estación de ferrocarril', 'monumento'])).toBe(false);
  });
});

describe('seccionDeTipos', () => {
  it('coloca cada lugar en la sección de la guía que le toca (para los intereses y las insignias)', () => {
    expect(seccionDeTipos(['museo de arte'])).toBe('Ver › Museos');
    expect(seccionDeTipos(['parque urbano'])).toBe('Ver › Parques y jardines');
    expect(seccionDeTipos(['mercado'])).toBe('Comprar › Mercados');
    expect(seccionDeTipos(['bar'])).toBe('Comer');
    expect(seccionDeTipos(['tablao flamenco'])).toBe('Beber y salir');
    expect(seccionDeTipos(['barrio'])).toBe('Ver › Barrios');
    expect(seccionDeTipos(['iglesia', 'monumento'])).toBe('Ver › Monumentos');
  });
});

describe('lugaresDeSparql', () => {
  const fila = (qid: string, nombre: string, tipos: string, enlaces = '10') => ({
    item: { value: `http://www.wikidata.org/entity/${qid}` },
    itemLabel: { value: nombre },
    articulo: { value: `https://es.wikipedia.org/wiki/${encodeURIComponent(nombre.replaceAll(' ', '_'))}` },
    coord: { value: 'Point(-5.9931 37.3859)' },
    enlaces: { value: enlaces },
    tipos: { value: tipos },
  });

  it('convierte las filas en lugares con coordenadas y título del artículo', () => {
    const [lugar] = lugaresDeSparql([fila('Q1', 'Casa de Pilatos', 'palacio|monumento')]);
    expect(lugar).toEqual({
      qid: 'Q1',
      nombre: 'Casa de Pilatos',
      titulo: 'Casa de Pilatos',
      url: 'https://es.wikipedia.org/wiki/Casa_de_Pilatos',
      lat: 37.3859,
      lon: -5.9931,
      enlaces: 10,
      tipos: ['palacio', 'monumento'],
    });
  });

  it('se queda solo con lo visitable, sin repetir', () => {
    const lugares = lugaresDeSparql([fila('Q1', 'Giralda', 'torre'), fila('Q1', 'Giralda', 'torre'), fila('Q2', 'Santa Justa', 'estación de ferrocarril')]);
    expect(lugares.map((l) => l.nombre)).toEqual(['Giralda']);
  });

  it('pone en mayúscula la primera letra del nombre («plaza de España» → «Plaza de España»)', () => {
    expect(lugaresDeSparql([fila('Q3', 'plaza de España', 'plaza')])[0]!.nombre).toBe('Plaza de España');
  });
});

describe('recortarExtracto', () => {
  it('deja el texto entero si es corto', () => {
    expect(recortarExtracto('Es un palacio. Tiene jardines.', 200)).toBe('Es un palacio. Tiene jardines.');
  });

  it('corta en el final de una frase, sin pasarse del máximo', () => {
    const texto = 'Primera frase corta. Segunda frase algo más larga que la primera. Tercera.';
    expect(recortarExtracto(texto, 50)).toBe('Primera frase corta.');
  });
});

describe('registroDeLugar', () => {
  const lugar: LugarWikidata = {
    qid: 'Q1',
    nombre: 'Casa de Pilatos',
    titulo: 'Casa de Pilatos',
    url: 'https://es.wikipedia.org/wiki/Casa_de_Pilatos',
    lat: 37.39,
    lon: -5.98,
    enlaces: 19,
    tipos: ['palacio'],
  };

  it('el texto empieza por el nombre (así la postal y la verificación lo encuentran) y lleva fuente y coordenadas', () => {
    const registro = registroDeLugar(lugar, 'La Casa de Pilatos es un palacio andaluz.', { destino: 'Sevilla', revision: 123, fechaDescarga: '2026-11-04' });
    expect(registro.id).toBe('wikipedia:Sevilla:Q1');
    expect(registro.documento).toBe('Casa de Pilatos: La Casa de Pilatos es un palacio andaluz.');
    expect(registro.textoEmbedding).toBe('Sevilla › Ver › Monumentos: Casa de Pilatos: La Casa de Pilatos es un palacio andaluz.');
    expect(registro.metadatos).toMatchObject({
      destino: 'Sevilla',
      fuente: 'Wikipedia',
      licencia: 'CC BY-SA 4.0',
      url: 'https://es.wikipedia.org/wiki/Casa_de_Pilatos',
      seccion: 'Ver › Monumentos',
      lugar: 'Casa de Pilatos',
      lat: 37.39,
      lon: -5.98,
    });
  });
});
