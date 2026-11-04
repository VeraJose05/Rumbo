// RF-14: qué lugares de la guía se pueden poner en el mapa. Wikivoyage en español casi no trae
// coordenadas (1-3 por ciudad), así que se geolocalizan sus nombres con Nominatim (OpenStreetMap)
// una sola vez (geocodificar.ts). Aquí, la parte determinista: sacar los nombres y filtrar resultados.

export interface LugarGuia {
  nombre: string;
  /** Lo que la guía pone entre paréntesis tras el nombre: casi siempre la dirección. */
  direccion?: string;
}

/**
 * Encabezado genérico en plural y sin nombre propio («Centros comerciales», «Bares de tapas»): no
 * es un sitio, y Wikipedia le encontraba un artículo cualquiera. «Jardines de Sabatini» sí lo es.
 */
function esGenerico(nombre: string): boolean {
  const [primera = '', ...resto] = nombre.split(/\s+/);
  return /s$/i.test(primera) && resto.every((p) => p === p.toLowerCase());
}

// Una viñeta «* Nombre (dirección): descripción», con «-», «–», «.» o «,» en lugar de «:».
const VINETA = /^\*+\s*(.+)$/;
const MAX_PALABRAS = 7;

export function lugaresDeFragmento(texto: string): LugarGuia[] {
  const lugares: LugarGuia[] = [];
  for (const linea of texto.split('\n')) {
    const vineta = VINETA.exec(linea.trim());
    if (!vineta) continue;
    const resto = vineta[1]!;
    // El nombre acaba en el primer separador; el paréntesis justo detrás es la dirección.
    const corte = /\s+[-–]\s|\s*[:,(]|\.(\s|$)/.exec(resto);
    const nombre = (corte ? resto.slice(0, corte.index) : resto).trim();
    if (!nombre || /^[-–]/.test(nombre) || nombre.split(/\s+/).length > MAX_PALABRAS || esGenerico(nombre)) continue;
    const parentesis = corte?.[0].includes('(') ? /^\(([^)]+)\)/.exec(resto.slice(corte.index).trimStart()) : null;
    lugares.push(parentesis ? { nombre, direccion: parentesis[1]!.trim() } : { nombre });
  }
  return lugares;
}

// Secciones de la guía con sitios que visitar (la principal, antes de «›»).
const SECCIONES = ['ver', 'hacer', 'comer', 'beber y salir', 'salir', 'comprar', 'distritos', 'barrios', 'lugares de interés'];
const SUBSECCIONES_FUERA = ['comidas típicas', 'platos típicos'];

export function seccionConLugares(seccion: string): boolean {
  const [principal = '', sub = ''] = seccion.toLowerCase().split('›').map((s) => s.trim());
  return SECCIONES.includes(principal) && !SUBSECCIONES_FUERA.includes(sub);
}

const ES_CALLE = /^(calle|carrer|avenida|avinguda|paseo|passeig|plaza|plaça|rambla|gran v[ií]a)\b/i;

// Niveles que son una ciudad o algo mayor: no son un lugar dentro del destino.
const AREAS_GRANDES = ['city', 'town', 'village', 'municipality', 'county', 'state', 'province', 'region', 'country'];

/**
 * ¿Vale lo que devuelve Nominatim? Fuera las calles (una búsqueda de «Huelva» encontraba la
 * «Calle Alonso Sánchez de Huelva»), salvo que lo buscado sea una calle, y fuera las ciudades
 * enteras. Los barrios sí valen aunque sean un límite administrativo (Albaicín, Raval).
 */
export function aceptarResultado(resultado: { class: string; type: string; addresstype?: string }, buscado = ''): boolean {
  if (resultado.class === 'highway') return ES_CALLE.test(buscado.trim());
  if (resultado.class === 'boundary') return !AREAS_GRANDES.includes(resultado.addresstype ?? 'city');
  if (resultado.class === 'place' && AREAS_GRANDES.includes(resultado.type)) return false;
  return true;
}

/** Distancia en km entre dos puntos [lat, lon] (fórmula del semiverseno). */
export function distanciaKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export const RADIO_CIUDAD_KM = 10;

/** Lo único que se acepta lejos del centro: naturaleza de verdad (parques naturales, playas, la Albufera). */
function esNaturaleza({ class: clase, type }: { class: string; type?: string }): boolean {
  if (clase === 'natural') return true;
  if (clase === 'leisure') return ['nature_reserve', 'park', 'garden', 'beach_resort'].includes(type ?? '');
  return clase === 'boundary' && (type === 'protected_area' || type === 'national_park');
}

/**
 * ¿Está donde cabe esperarlo? Cerca del centro, cualquier cosa; más lejos, solo naturaleza. Con la
 * caja ampliada salían homónimos: «El Almendro 13» (un bar de La Latina) a 40 km, o el «Barrio de
 * Santa Cruz» en un monumento de Olivares a 18 km.
 */
export function dentroDeAlcance(resultado: { lat: string; lon: string; class: string; type?: string }, centro: [number, number]): boolean {
  const km = distanciaKm([Number(resultado.lat), Number(resultado.lon)], centro);
  return km <= RADIO_CIUDAD_KM || esNaturaleza(resultado);
}

// ---------- ¿El resultado se llama como lo buscado? ----------
// Nominatim busca por aproximación: «Boss» (una discoteca) encontraba un «Bosque natural».

const VACIAS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'i', 'els', 'dels']);
const GENERICOS = new Set(['barrio', 'barri', 'zona']);

const palabras = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

function levenshtein(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0]!;
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j]!;
      fila[j] = Math.min(fila[j]! + 1, fila[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = arriba;
    }
  }
  return fila[b.length]!;
}

/** Misma palabra, o variante cercana con el mismo comienzo (Museo/Museu, Plaza/Plaça, Real/Reial). */
const parecida = (a: string, b: string) => a === b || (a.slice(0, 2) === b.slice(0, 2) && Math.min(a.length, b.length) >= 3 && levenshtein(a, b) <= 2);

/**
 * Todas las palabras que distinguen lo buscado (sin artículos, «barrio» ni la ciudad) están en el
 * nombre del resultado. Con una sola palabra, casi exacta.
 */
export function nombreCoincide(buscado: string, nombreResultado: string, destino = ''): boolean {
  const ciudad = new Set(palabras(destino));
  const clave = palabras(buscado).filter((p) => !VACIAS.has(p) && !GENERICOS.has(p) && !ciudad.has(p));
  const nombre = palabras(nombreResultado);
  if (!clave.length) return false;
  if (clave.length === 1) return nombre.some((p) => p === clave[0] || (p.length >= 5 && levenshtein(p, clave[0]!) <= 1));
  return clave.every((p) => nombre.some((q) => parecida(p, q)));
}

/** «Barrio de Santa Cruz» → «Santa Cruz», para una segunda búsqueda; null si no hay nada que quitar. */
export function sinGenerico(nombre: string): string | null {
  const resto = nombre.replace(/^\s*(el|la|los|las)?\s*(barrio|barri|zona)\s+(de\s+la|de\s+los|del|de)?\s*/i, '').trim();
  return resto && resto !== nombre.trim() ? resto : null;
}

// ---------- Segunda fuente: Wikipedia ----------
// Los monumentos tienen artículo con coordenadas, y Wikipedia ya resuelve los nombres alternativos
// con sus redirecciones («Reales Alcázares» → «Real Alcázar de Sevilla»).

export interface PaginaWikipedia {
  title: string;
  coordinates?: { lat: number; lon: number }[];
  redirects?: { title: string }[];
}

/**
 * El artículo que corresponde al lugar de la guía: con coordenadas, dentro de la ciudad (sin
 * excepciones: Wikipedia no dice qué tipo de sitio es) y con el título o una redirección que se
 * llame como lo buscado.
 */
export function elegirArticulo(paginas: PaginaWikipedia[], nombre: string, destino: string, centro: [number, number]) {
  for (const pagina of paginas) {
    const punto = pagina.coordinates?.[0];
    if (!punto || distanciaKm([punto.lat, punto.lon], centro) > RADIO_CIUDAD_KM) continue;
    const titulos = [pagina.title, ...(pagina.redirects ?? []).map((r) => r.title)].map((t) => t.replace(/\s*\([^)]*\)$/, ''));
    if (titulos.some((t) => nombreCoincide(nombre, t, destino))) return { titulo: pagina.title, lat: punto.lat, lon: punto.lon };
  }
  return null;
}
