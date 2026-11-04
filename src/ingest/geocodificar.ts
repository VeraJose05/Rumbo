// RF-14: geolocaliza una vez los lugares de la guía con Nominatim (OpenStreetMap) y los guarda en
// web/public/datos/coordenadas.json para el mapa (npm run coordenadas). Respeta su política de uso:
// se identifica, como mucho 1 consulta por segundo, y reutiliza lo ya buscado en ejecuciones previas.
// Si OSM no lo tiene (o lo llama distinto), se prueba con los artículos de Wikipedia en español.
// Los datos son © colaboradores de OpenStreetMap (ODbL) y de Wikipedia: la web lo cita.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { leerIndice } from '../almacen/memoria.js';
import { RADIO_CIUDAD_KM, aceptarResultado, dentroDeAlcance, distanciaKm, elegirArticulo, lugaresDeFragmento, nombreCoincide, seccionConLugares, sinGenerico, type LugarGuia, type PaginaWikipedia } from './coordenadas.js';

const SALIDA = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'web/public/datos/coordenadas.json';
// --reintentar: vuelve a buscar los que no se encontraron (p. ej. tras cambiar el filtro).
const REINTENTAR = process.argv.includes('--reintentar');
// Margen alrededor de la ciudad (~15 km): excursiones cercanas como la Albufera o el Garraf.
const MARGEN = 0.15;
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const WIKIPEDIA = 'https://es.wikipedia.org/w/api.php';
const AGENTE = 'Rumbo-TFM/0.1 (https://github.com/VeraJose05/Rumbo)';
const ESPERA_MS = 1100;

interface LugarConCoordenadas {
  nombre: string;
  seccion: string;
  lat: number;
  lon: number;
  /** De dónde salen las coordenadas: OpenStreetMap (Nominatim) o Wikipedia. */
  origen?: 'osm' | 'wikipedia' | 'wikidata';
}
interface Destino {
  centro: [number, number];
  lugares: LugarConCoordenadas[];
  /** Buscados sin resultado fiable: no se vuelven a buscar. */
  sinUbicar: string[];
}
export interface Coordenadas {
  fuente: string;
  generado: string;
  destinos: Record<string, Destino>;
}

interface Resultado {
  lat: string;
  lon: string;
  class: string;
  type: string;
  addresstype?: string;
  name?: string;
  display_name: string;
  /** Todas las formas del nombre en OSM (name:es, name:ca, alt_name, old_name…). */
  namedetails?: Record<string, string> | null;
  boundingbox: [string, string, string, string];
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buscar(consulta: string, caja?: string): Promise<Resultado[]> {
  await esperar(ESPERA_MS);
  const url = new URL(NOMINATIM);
  url.search = new URLSearchParams({ q: consulta, format: 'json', limit: '3', namedetails: '1', 'accept-language': 'es', ...(caja ? { viewbox: caja, bounded: '1' } : {}) }).toString();
  const respuesta = await fetch(url, { headers: { 'User-Agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status} a «${consulta}»`);
  return (await respuesta.json()) as Resultado[];
}

async function ubicar(lugar: LugarGuia, destino: string, caja: string, centro: [number, number]): Promise<Resultado | undefined> {
  // De los candidatos válidos, el más cercano al centro (homónimos en otros barrios o pueblos).
  const elMejor = (resultados: Resultado[], vale: (r: Resultado) => boolean) =>
    resultados
      .filter((r) => vale(r) && dentroDeAlcance(r, centro))
      .sort((a, b) => distanciaKm([+a.lat, +a.lon], centro) - distanciaKm([+b.lat, +b.lon], centro))[0];
  // Además de ser un tipo de sitio válido, tiene que llamarse como lo buscado.
  const valeNombre = (buscado: string) => (r: Resultado) =>
    aceptarResultado(r, buscado) &&
    [r.name, r.display_name.split(',')[0], ...Object.values(r.namedetails ?? {})].some((n) => n && nombreCoincide(buscado, n, destino));
  let porNombre = elMejor(await buscar(lugar.nombre, caja), valeNombre(lugar.nombre));
  const corto = sinGenerico(lugar.nombre);
  if (!porNombre && corto) porNombre = elMejor(await buscar(corto, caja), valeNombre(corto));
  if (porNombre || !lugar.direccion) return porNombre;
  // Sin el nombre en OpenStreetMap, la dirección que da la guía (el edificio o la calle valen).
  return elMejor(await buscar(`${lugar.direccion}, ${destino}`, caja), (r) => r.class !== 'boundary');
}

/** Segunda fuente: artículos de Wikipedia con coordenadas (sus redirecciones resuelven otros nombres). */
async function buscarEnWikipedia(lugar: LugarGuia, destino: string, centro: [number, number]) {
  await esperar(ESPERA_MS);
  const url = new URL(WIKIPEDIA);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${lugar.nombre} ${destino}`,
    gsrlimit: '5',
    prop: 'coordinates|redirects',
    coprimary: 'primary',
    colimit: 'max',
    rdlimit: 'max',
  }).toString();
  const respuesta = await fetch(url, { headers: { 'User-Agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`Wikipedia respondió ${respuesta.status} a «${lugar.nombre}»`);
  const datos = (await respuesta.json()) as { query?: { pages?: (PaginaWikipedia & { index: number })[] } };
  const paginas = (datos.query?.pages ?? []).sort((a, b) => a.index - b.index);
  return elegirArticulo(paginas, lugar.nombre, destino, centro);
}

async function leerAnterior(): Promise<Coordenadas | null> {
  try {
    return JSON.parse(await readFile(SALIDA, 'utf8')) as Coordenadas;
  } catch {
    return null;
  }
}

// Lugares por destino (sin repetir) de las secciones con sitios que visitar.
const indice = leerIndice(await readFile('indice/destinos.json', 'utf8'));
const porDestino = new Map<string, Map<string, LugarGuia & { seccion: string }>>();
for (const { texto, metadata } of indice.registros) {
  const seccion = String(metadata.seccion ?? '');
  if (!seccionConLugares(seccion)) continue;
  const destino = String(metadata.destino);
  const lugares = porDestino.get(destino) ?? new Map();
  for (const lugar of lugaresDeFragmento(texto)) if (!lugares.has(lugar.nombre)) lugares.set(lugar.nombre, { ...lugar, seccion });
  porDestino.set(destino, lugares);
}

const anterior = await leerAnterior();
const salida: Coordenadas = {
  fuente: '© colaboradores de OpenStreetMap (ODbL), vía Nominatim, y de Wikipedia',
  generado: new Date().toISOString().slice(0, 10),
  destinos: {},
};

for (const [destino, lugares] of porDestino) {
  const previo = anterior?.destinos[destino];
  let centro = previo?.centro;
  let caja: string;
  if (previo) {
    // La caja de la ciudad se recalcula a partir del centro: ±0,12° (unos 12 km) para el casco.
    caja = [centro![1] - 0.12 - MARGEN, centro![0] + 0.12 + MARGEN, centro![1] + 0.12 + MARGEN, centro![0] - 0.12 - MARGEN].join(',');
  } else {
    const [ciudad] = await buscar(`${destino}, España`);
    if (!ciudad) throw new Error(`No encuentro ${destino} en Nominatim`);
    const [sur, norte, oeste, este] = ciudad.boundingbox.map(Number) as [number, number, number, number];
    centro = [Number(ciudad.lat), Number(ciudad.lon)];
    caja = [oeste - MARGEN, norte + MARGEN, este + MARGEN, sur - MARGEN].join(',');
  }
  const destinoSalida: Destino = { centro: centro!, lugares: [], sinUbicar: [] };
  for (const lugar of lugares.values()) {
    const hecho = previo?.lugares.find((l) => l.nombre === lugar.nombre);
    // Lo de fuera del radio de la ciudad se vuelve a comprobar con los criterios actuales.
    if (hecho && distanciaKm([hecho.lat, hecho.lon], centro!) <= RADIO_CIUDAD_KM) {
      destinoSalida.lugares.push(hecho);
      continue;
    }
    if (!REINTENTAR && previo?.sinUbicar.includes(lugar.nombre)) {
      destinoSalida.sinUbicar.push(lugar.nombre);
      continue;
    }
    const resultado = await ubicar(lugar, destino, caja, centro!);
    const articulo = resultado ? null : await buscarEnWikipedia(lugar, destino, centro!);
    if (resultado) {
      destinoSalida.lugares.push({ nombre: lugar.nombre, seccion: lugar.seccion, lat: Number(resultado.lat), lon: Number(resultado.lon), origen: 'osm' });
    } else if (articulo) {
      destinoSalida.lugares.push({ nombre: lugar.nombre, seccion: lugar.seccion, lat: articulo.lat, lon: articulo.lon, origen: 'wikipedia' });
    } else {
      destinoSalida.sinUbicar.push(lugar.nombre);
    }
    process.stdout.write(resultado ? '·' : articulo ? 'w' : 'x');
  }
  // Los lugares que vienen de Wikidata (npm run ingesta:wikipedia) ya traen sus coordenadas.
  destinoSalida.lugares.push(...(previo?.lugares.filter((l) => l.origen === 'wikidata') ?? []));
  salida.destinos[destino] = destinoSalida;
  console.log(`\n${destino}: ${destinoSalida.lugares.length} de ${lugares.size} lugares ubicados`);
  // Se guarda tras cada ciudad: si algo falla a mitad, lo hecho no se pierde.
  await mkdir(dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, JSON.stringify({ ...salida, destinos: { ...anterior?.destinos, ...salida.destinos } }, null, 1));
}
