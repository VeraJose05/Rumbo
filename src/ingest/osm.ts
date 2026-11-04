// RF-03, RF-14: tercera fuente del corpus, para gastronomía y noche. Wikipedia apenas tiene bares y
// restaurantes, y los de Wikivoyage son de una guía antigua (muchos ya cerraron). OpenStreetMap
// tiene miles por ciudad, al día y con su ubicación; se eligen los de datos más completos (señal
// de que siguen abiertos) y cada uno entra con una ficha escrita a partir de sus etiquetas.
// Aquí, la parte determinista; la descarga está en indexar-osm.ts.
import type { Registro } from './registros.js';
import { textoConContexto } from './troceado.js';

export interface ElementoOsm {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  /** Centro de los edificios y áreas (Overpass con «out center»). */
  center?: { lat: number; lon: number };
  version?: number;
  tags: Record<string, string>;
}

export const TIPOS = ['restaurant', 'bar', 'pub', 'cafe', 'nightclub'] as const;
type Tipo = (typeof TIPOS)[number];

/** Cuántos de cada tipo por ciudad: de todo, sin que los restaurantes lo llenen todo. */
export const CUPOS_POR_DEFECTO: Record<Tipo, number> = { restaurant: 70, bar: 45, pub: 15, cafe: 20, nightclub: 15 };

/** Consulta de Overpass: locales con nombre a `radioM` metros del centro. */
export function consultaOverpass([lat, lon]: [number, number], radioM: number): string {
  return `[out:json][timeout:90];nwr["amenity"~"^(${TIPOS.join('|')})$"]["name"](around:${radioM},${lat},${lon});out center tags qt;`;
}

/** Cuanto más completa la ficha, más probable que el local siga abierto; Wikidata = conocido. */
export function puntuarLocal(tags: Record<string, string>): number {
  let puntos = 0;
  if (tags.wikidata || tags.wikipedia) puntos += 5;
  if (tags.cuisine) puntos += 1;
  if (tags.opening_hours) puntos += 1;
  if (tags.website || tags['contact:website']) puntos += 1;
  if (tags.phone || tags['contact:phone']) puntos += 1;
  if (tags['addr:street']) puntos += 1;
  return puntos;
}

const cerrado = (tags: Record<string, string>) =>
  Object.keys(tags).some((k) => /^(disused|was|abandoned|demolished):/.test(k)) || tags.opening_hours === 'closed';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Sin cadenas ni cerrados, sin repetir; por tipo, los mejor puntuados hasta su cupo. */
export function elegirLocales(elementos: ElementoOsm[], cupos: Record<Tipo, number> = CUPOS_POR_DEFECTO): ElementoOsm[] {
  const vistos = new Set<string>();
  const validos = elementos.filter((e) => {
    const nombre = e.tags.name?.trim();
    if (!nombre || e.tags.brand || e.tags['brand:wikidata'] || cerrado(e.tags)) return false;
    const clave = normalizar(nombre);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  return TIPOS.flatMap((tipo) =>
    validos
      .filter((e) => e.tags.amenity === tipo)
      .sort((a, b) => puntuarLocal(b.tags) - puntuarLocal(a.tags))
      .slice(0, cupos[tipo]),
  );
}

const NOMBRE_TIPO: Record<string, string> = { restaurant: 'restaurante', bar: 'bar', pub: 'pub', cafe: 'cafetería', nightclub: 'discoteca' };

// Cocinas de OSM en español; las que son un producto y no una cocina («coffee_shop») no se dicen.
const COCINAS: Record<string, string | null> = {
  spanish: 'española', regional: 'regional', mediterranean: 'mediterránea', andalusian: 'andaluza', basque: 'vasca',
  catalan: 'catalana', valencian: 'valenciana', galician: 'gallega', asturian: 'asturiana', italian: 'italiana',
  pizza: 'italiana', japanese: 'japonesa', sushi: 'japonesa', chinese: 'china', mexican: 'mexicana', indian: 'india',
  thai: 'tailandesa', french: 'francesa', argentinian: 'argentina', peruvian: 'peruana', lebanese: 'libanesa',
  greek: 'griega', vegetarian: 'vegetariana', vegan: 'vegana', seafood: 'marinera', fish: 'marinera', burger: 'americana',
  american: 'americana', kebab: 'turca', turkish: 'turca', korean: 'coreana', vietnamese: 'vietnamita', moroccan: 'marroquí',
  paella: 'de arroces', rice: 'de arroces', international: 'internacional', fusion: 'de fusión',
  coffee_shop: null, sandwich: null, ice_cream: null, breakfast: null, cake: null, tea: null, juice: null, tapas: null,
};

const enumerar = (partes: string[]) => (partes.length < 2 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`);

/** Ficha del local, en una frase: tipo, cocina, terraza y dirección. */
export function textoDeLocal(tags: Record<string, string>): string {
  const cocinas = (tags.cuisine ?? '').split(';').map((c) => c.trim().toLowerCase()).filter(Boolean);
  const conTapas = cocinas.includes('tapas');
  const resto = [...new Set(cocinas.map((c) => (c in COCINAS ? COCINAS[c] : c.replaceAll('_', ' '))).filter((c): c is string => Boolean(c)))];
  let descripcion = NOMBRE_TIPO[tags.amenity ?? ''] ?? 'local';
  if (conTapas) descripcion += ' de tapas' + (resto.length ? ` y cocina ${enumerar(resto)}` : '');
  else if (resto.length) descripcion += ` de cocina ${enumerar(resto)}`;
  if (tags.outdoor_seating === 'yes') descripcion += ', con terraza';
  const calle = tags['addr:street'];
  if (calle) descripcion += `, en ${calle}${tags['addr:housenumber'] ? ` ${tags['addr:housenumber']}` : ''}`;
  return `${tags.name}: ${descripcion}.`;
}

export function seccionDeLocal(tags: Record<string, string>): string {
  if (tags.amenity === 'restaurant') return 'Comer › Restaurantes';
  if (tags.amenity === 'cafe') return 'Comer › Cafeterías';
  if (tags.amenity === 'bar' && (tags.cuisine ?? '').includes('tapas')) return 'Comer › Tapas';
  return 'Beber y salir';
}

export function coordenadasDe(elemento: ElementoOsm): { lat: number; lon: number } {
  return elemento.center ?? { lat: elemento.lat!, lon: elemento.lon! };
}

export function registroDeLocal(elemento: ElementoOsm, { destino, fechaDescarga }: { destino: string; fechaDescarga: string }): Registro {
  const seccion = seccionDeLocal(elemento.tags);
  const documento = textoDeLocal(elemento.tags);
  const { lat, lon } = coordenadasDe(elemento);
  const ruta = `${elemento.type}/${elemento.id}`;
  return {
    id: `osm:${destino}:${ruta}`,
    documento,
    textoEmbedding: textoConContexto(destino, { seccion: seccion.split(' › '), texto: documento }),
    metadatos: {
      destino,
      fuente: 'OpenStreetMap',
      licencia: 'ODbL',
      url: `https://www.openstreetmap.org/${ruta}`,
      seccion,
      revision: elemento.version ?? 0,
      fechaDescarga,
      lugar: elemento.tags.name!,
      lat,
      lon,
    },
  };
}
