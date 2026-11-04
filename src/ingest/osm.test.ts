// RF-03, RF-14: restaurantes, bares y ocio nocturno de OpenStreetMap como tercera fuente del corpus.
import { describe, expect, it } from 'vitest';
import { elegirLocales, puntuarLocal, registroDeLocal, seccionDeLocal, textoDeLocal, type ElementoOsm } from './osm.js';

const local = (id: number, tags: Record<string, string>, lat = 37.39, lon = -5.99): ElementoOsm => ({ type: 'node', id, lat, lon, version: 3, tags });

describe('puntuarLocal', () => {
  it('cuantos más datos tiene, más probable es que siga abierto', () => {
    const pobre = puntuarLocal({ amenity: 'bar', name: 'Bar X' });
    const completo = puntuarLocal({ amenity: 'bar', name: 'Bar Y', cuisine: 'tapas', opening_hours: 'Mo-Su 12:00-24:00', website: 'https://bary.es', phone: '+34 954 000 000' });
    expect(completo).toBeGreaterThan(pobre);
  });

  it('tener ficha en Wikidata o Wikipedia es la mejor señal (sitios conocidos)', () => {
    expect(puntuarLocal({ amenity: 'bar', name: 'El Rinconcillo', wikidata: 'Q1' })).toBeGreaterThan(
      puntuarLocal({ amenity: 'bar', name: 'Otro', cuisine: 'tapas', opening_hours: 'x', website: 'y' }),
    );
  });
});

describe('elegirLocales', () => {
  it('descarta cadenas, locales sin nombre y los que OSM marca como cerrados', () => {
    const elegidos = elegirLocales([
      local(1, { amenity: 'restaurant', name: "McDonald's", brand: "McDonald's" }),
      local(2, { amenity: 'restaurant' }),
      local(3, { amenity: 'bar', name: 'Cerrado', 'disused:amenity': 'bar' }),
      local(4, { amenity: 'bar', name: 'Abierto', cuisine: 'tapas' }),
    ]);
    expect(elegidos.map((e) => e.tags.name)).toEqual(['Abierto']);
  });

  it('reparte por tipo con un cupo para cada uno y elige los mejor puntuados', () => {
    const elementos = [
      local(1, { amenity: 'restaurant', name: 'R pobre' }),
      local(2, { amenity: 'restaurant', name: 'R rico', cuisine: 'spanish', website: 'w', opening_hours: 'h' }),
      local(3, { amenity: 'nightclub', name: 'Disco' }),
      local(4, { amenity: 'cafe', name: 'Café' }),
    ];
    const elegidos = elegirLocales(elementos, { restaurant: 1, bar: 1, pub: 1, cafe: 1, nightclub: 1 });
    expect(elegidos.map((e) => e.tags.name)).toEqual(['R rico', 'Café', 'Disco']);
  });

  it('no repite el mismo local aunque OSM lo tenga como punto y como edificio', () => {
    const elegidos = elegirLocales([local(1, { amenity: 'bar', name: 'Casa Morales' }), { ...local(2, { amenity: 'bar', name: 'Casa Morales' }), type: 'way' }]);
    expect(elegidos).toHaveLength(1);
  });
});

describe('textoDeLocal', () => {
  it('describe el local con sus datos, en español', () => {
    expect(
      textoDeLocal({
        amenity: 'bar',
        name: 'Bodega Santa Cruz',
        cuisine: 'tapas;spanish',
        outdoor_seating: 'yes',
        'addr:street': 'Calle Rodrigo Caro',
        'addr:housenumber': '1',
      }),
    ).toBe('Bodega Santa Cruz: bar de tapas y cocina española, con terraza, en Calle Rodrigo Caro 1.');
  });

  it('sin datos extra, al menos el tipo', () => {
    expect(textoDeLocal({ amenity: 'nightclub', name: 'Sala X' })).toBe('Sala X: discoteca.');
  });

  it('las cocinas que no conoce las deja legibles', () => {
    expect(textoDeLocal({ amenity: 'restaurant', name: 'R', cuisine: 'basque_fusion' })).toBe('R: restaurante de cocina basque fusion.');
  });
});

describe('seccionDeLocal', () => {
  it('restaurantes y cafeterías a «Comer»; bares, pubs y discotecas a «Beber y salir»; bares de tapas a comer', () => {
    expect(seccionDeLocal({ amenity: 'restaurant' })).toBe('Comer › Restaurantes');
    expect(seccionDeLocal({ amenity: 'cafe' })).toBe('Comer › Cafeterías');
    expect(seccionDeLocal({ amenity: 'bar', cuisine: 'tapas' })).toBe('Comer › Tapas');
    expect(seccionDeLocal({ amenity: 'pub' })).toBe('Beber y salir');
    expect(seccionDeLocal({ amenity: 'nightclub' })).toBe('Beber y salir');
  });
});

describe('registroDeLocal', () => {
  it('fragmento con fuente OpenStreetMap (ODbL), enlace al elemento y coordenadas', () => {
    const registro = registroDeLocal(local(42, { amenity: 'bar', name: 'El Rinconcillo', cuisine: 'tapas' }), { destino: 'Sevilla', fechaDescarga: '2026-11-04' });
    expect(registro.id).toBe('osm:Sevilla:node/42');
    expect(registro.documento).toBe('El Rinconcillo: bar de tapas.');
    expect(registro.textoEmbedding).toBe('Sevilla › Comer › Tapas: El Rinconcillo: bar de tapas.');
    expect(registro.metadatos).toMatchObject({
      destino: 'Sevilla',
      fuente: 'OpenStreetMap',
      licencia: 'ODbL',
      url: 'https://www.openstreetmap.org/node/42',
      seccion: 'Comer › Tapas',
      lugar: 'El Rinconcillo',
      lat: 37.39,
      lon: -5.99,
      revision: 3,
    });
  });

  it('los edificios (way) usan su centro', () => {
    const edificio: ElementoOsm = { type: 'way', id: 7, center: { lat: 1, lon: 2 }, version: 1, tags: { amenity: 'pub', name: 'P' } };
    expect(registroDeLocal(edificio, { destino: 'Madrid', fechaDescarga: 'x' }).metadatos).toMatchObject({ lat: 1, lon: 2 });
  });
});
