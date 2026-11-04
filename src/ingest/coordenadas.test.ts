// RF-14: lugares de la guía que se pueden poner en el mapa y filtro de lo que devuelve Nominatim.
import { describe, expect, it } from 'vitest';
import { aceptarResultado, dentroDeAlcance, distanciaKm, lugaresDeFragmento, nombreCoincide, seccionConLugares, sinGenerico } from './coordenadas.js';

describe('lugaresDeFragmento', () => {
  it('saca el nombre de cada viñeta, cortando en la descripción', () => {
    const texto = [
      'Los monumentos principales:',
      '* Catedral de Sevilla - Es la catedral gótica más grande del mundo.',
      '* Museo Thyssen-Bornemisza: Una de las mayores colecciones privadas.',
      '* Parque del Alamillo, . Situado en la periferia.',
      '* Alhambra.',
      '** Calle Preciados',
    ].join('\n');
    expect(lugaresDeFragmento(texto).map((l) => l.nombre)).toEqual([
      'Catedral de Sevilla',
      'Museo Thyssen-Bornemisza',
      'Parque del Alamillo',
      'Alhambra',
      'Calle Preciados',
    ]);
  });

  it('guarda la dirección que va entre paréntesis', () => {
    expect(lugaresDeFragmento("* Can Culleretes (Carrer d'en Quintana 5): Fundado en 1786.")).toEqual([
      { nombre: 'Can Culleretes', direccion: "Carrer d'en Quintana 5" },
    ]);
  });

  it('descarta viñetas que no son un nombre (frases largas o vacías)', () => {
    const texto = '* Existen también 5 líneas de cercanías que conectan la ciudad con toda la provincia\n* - suelta';
    expect(lugaresDeFragmento(texto)).toEqual([]);
  });
});

describe('seccionConLugares', () => {
  it('acepta las secciones de sitios que visitar', () => {
    for (const s of ['Ver', 'Ver › Museos', 'Comer › Restaurantes', 'Beber y salir', 'Comprar', 'Distritos', 'Lugares de interés', 'Hacer']) {
      expect(seccionConLugares(s), s).toBe(true);
    }
  });

  it('descarta transporte, otros destinos y platos típicos', () => {
    for (const s of ['Llegar › En avión', 'Cómo desplazarse › En metro', 'Siguiente destino', '¿A dónde ir luego?', 'Comer › Comidas típicas']) {
      expect(seccionConLugares(s), s).toBe(false);
    }
  });
});

describe('aceptarResultado', () => {
  it('acepta monumentos, parques, museos y barrios', () => {
    expect(aceptarResultado({ class: 'amenity', type: 'place_of_worship' })).toBe(true);
    expect(aceptarResultado({ class: 'leisure', type: 'park' })).toBe(true);
    expect(aceptarResultado({ class: 'place', type: 'neighbourhood' })).toBe(true);
  });

  it('rechaza calles (Huelva → «Calle Alonso Sánchez de Huelva») salvo que se busque una calle', () => {
    expect(aceptarResultado({ class: 'highway', type: 'residential' })).toBe(false);
    expect(aceptarResultado({ class: 'highway', type: 'pedestrian' }, 'Calle Preciados')).toBe(true);
  });

  it('rechaza ciudades enteras: la ciudad no es un lugar dentro de ella', () => {
    expect(aceptarResultado({ class: 'boundary', type: 'administrative', addresstype: 'city' })).toBe(false);
    expect(aceptarResultado({ class: 'boundary', type: 'administrative', addresstype: 'municipality' })).toBe(false);
    expect(aceptarResultado({ class: 'place', type: 'city' })).toBe(false);
  });

  it('acepta barrios aunque OpenStreetMap los guarde como límite administrativo (Albaicín, Raval)', () => {
    expect(aceptarResultado({ class: 'boundary', type: 'administrative', addresstype: 'suburb' })).toBe(true);
    expect(aceptarResultado({ class: 'boundary', type: 'administrative', addresstype: 'neighbourhood' })).toBe(true);
  });
});

describe('dentroDeAlcance', () => {
  const SEVILLA: [number, number] = [37.3886, -5.9823];

  it('acepta cualquier sitio a menos de 10 km del centro', () => {
    expect(dentroDeAlcance({ lat: '37.3859', lon: '-5.9931', class: 'amenity', type: 'bar' }, SEVILLA)).toBe(true);
  });

  it('más lejos, solo naturaleza: parques naturales, playas, espacios protegidos (la Albufera)', () => {
    expect(dentroDeAlcance({ lat: '37.30', lon: '-6.20', class: 'natural', type: 'wetland' }, SEVILLA)).toBe(true);
    expect(dentroDeAlcance({ lat: '37.30', lon: '-6.20', class: 'leisure', type: 'nature_reserve' }, SEVILLA)).toBe(true);
    expect(dentroDeAlcance({ lat: '37.30', lon: '-6.20', class: 'boundary', type: 'protected_area' }, SEVILLA)).toBe(true);
  });

  it('lejos del centro, un bar, una tienda o un monumento suele ser otro con el mismo nombre', () => {
    expect(dentroDeAlcance({ lat: '37.30', lon: '-6.20', class: 'amenity', type: 'bar' }, SEVILLA)).toBe(false);
    expect(dentroDeAlcance({ lat: '37.30', lon: '-6.20', class: 'shop', type: 'mall' }, SEVILLA)).toBe(false);
    // «Barrio de Santa Cruz» encontraba el «Monumento a Santa Ángela de la Cruz» de Olivares, a 18 km.
    expect(dentroDeAlcance({ lat: '37.4159', lon: '-6.1568', class: 'historic', type: 'memorial' }, SEVILLA)).toBe(false);
  });
});

describe('distanciaKm', () => {
  it('calcula la distancia en línea recta (Catedral de Sevilla → Torre del Oro, ~0,5 km)', () => {
    expect(distanciaKm([37.3859, -5.9931], [37.3824, -5.9963])).toBeCloseTo(0.48, 1);
  });
});

describe('nombreCoincide', () => {
  it('acepta el mismo nombre aunque cambie el idioma (Museo/Museu, Plaza/Plaça)', () => {
    expect(nombreCoincide('Museo Picasso', 'Museu Picasso')).toBe(true);
    expect(nombreCoincide('Plaza Real', 'Plaça Reial')).toBe(true);
    expect(nombreCoincide('Catedral de Sevilla', 'Catedral de Sevilla')).toBe(true);
  });

  it('acepta el barrio aunque la guía diga «Barrio de»', () => {
    expect(nombreCoincide('Barrio de Santa Cruz', 'Santa Cruz')).toBe(true);
  });

  it('rechaza nombres que solo se parecen («Boss» no es «Bosque natural de Eucaliptus»)', () => {
    expect(nombreCoincide('Boss', 'Bosque natural de Eucaliptus')).toBe(false);
    expect(nombreCoincide('Café Charlotte', 'Calle Carlota')).toBe(false);
  });
});

describe('sinGenerico', () => {
  it('quita «Barrio de» y similares para una segunda búsqueda', () => {
    expect(sinGenerico('Barrio de Santa Cruz')).toBe('Santa Cruz');
    expect(sinGenerico('El barrio del Carmen')).toBe('Carmen');
    expect(sinGenerico('Torre del Oro')).toBeNull();
  });
});
