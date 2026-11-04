// RF-03, RF-14: segunda fuente del corpus. Wikivoyage en español se queda corta (unos 30 lugares
// en Sevilla, muchos con locales que ya cerraron); Wikidata da, con una consulta por ciudad, los
// lugares con artículo en la Wikipedia en español, su tipo, su importancia (en cuántas Wikipedias
// están) y sus coordenadas. Cada lugar entra en el índice como un fragmento con el resumen de su
// artículo: se cita en la postal y tiene su chincheta en el mapa. Aquí, la parte determinista.
import type { Registro } from './registros.js';
import { textoConContexto } from './troceado.js';

export interface LugarWikidata {
  qid: string;
  /** Nombre del lugar (etiqueta de Wikidata), con mayúscula inicial. */
  nombre: string;
  /** Título del artículo de la Wikipedia en español. */
  titulo: string;
  url: string;
  lat: number;
  lon: number;
  /** En cuántas Wikipedias tiene artículo: cuanto más, más conocido. */
  enlaces: number;
  /** Tipos («instancia de», P31) en español. */
  tipos: string[];
}

// Tipos de sitio que se visitan, y los que no aunque coincidan (una estación que es monumento).
const VISITABLE =
  /monumento|iglesia|catedral|bas[ií]lica|capilla|convento|monasterio|ermita|sinagoga|mezquita|palacio|alc[aá]zar|castillo|fortaleza|muralla|torre|puerta|arco|puente|plaza|parque|jard[ií]n|playa|mirador|barrio|museo|galer[ií]a|teatro|auditorio|mercado|fuente|escultura|estatua|casa|edificio|pabell[oó]n|yacimiento|ruinas|estadio|plaza de toros|acuario|zool[oó]gico|parque de atracciones|complejo|calle|avenida|paseo|rambla|bulevar|bar\b|restaurante|caf[eé]|tablao|bodega/i;
const NO_VISITABLE =
  /estaci[oó]n|municipio|ciudad|provincia|comarca|temporada|campeonato|copa|edici[oó]n|evento|asedio|batalla|universidad|colegio|hospital|distrito|biblioteca|editor|empresa|organizaci|sepultura|rotonda|exposici[oó]n universal|metro|aeropuerto|autov[ií]a|carretera|l[ií]nea/i;

export function esLugarVisitable(tipos: string[]): boolean {
  const todos = tipos.join('|');
  return VISITABLE.test(todos) && !NO_VISITABLE.test(todos);
}

// Sección de la guía en la que cae cada tipo: la usan las consultas por interés y las insignias.
const SECCIONES: [RegExp, string][] = [
  [/museo|galer[ií]a/i, 'Ver › Museos'],
  [/parque|jard[ií]n|mirador/i, 'Ver › Parques y jardines'],
  [/playa/i, 'Ver › Playas'],
  [/barrio/i, 'Ver › Barrios'],
  [/calle|avenida|paseo|rambla|bulevar/i, 'Ver › Calles y plazas'],
  [/mercado|centro comercial/i, 'Comprar › Mercados'],
  [/tablao|discoteca|sala de conciertos|club nocturno/i, 'Beber y salir'],
  [/bar\b|restaurante|caf[eé]|bodega|taberna/i, 'Comer'],
  [/teatro|auditorio|estadio|plaza de toros|acuario|zool[oó]gico|parque de atracciones/i, 'Hacer'],
];

export function seccionDeTipos(tipos: string[]): string {
  const todos = tipos.join('|');
  return SECCIONES.find(([patron]) => patron.test(todos))?.[1] ?? 'Ver › Monumentos';
}

interface FilaSparql {
  item: { value: string };
  itemLabel: { value: string };
  articulo: { value: string };
  coord: { value: string };
  enlaces: { value: string };
  tipos?: { value: string };
}

const mayusculaInicial = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Filas de la consulta SPARQL → lugares visitables, sin repetir. */
export function lugaresDeSparql(filas: FilaSparql[]): LugarWikidata[] {
  const vistos = new Set<string>();
  const lugares: LugarWikidata[] = [];
  for (const fila of filas) {
    const qid = fila.item.value.split('/').pop()!;
    const tipos = (fila.tipos?.value ?? '').split('|').filter(Boolean);
    const punto = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(fila.coord.value);
    if (vistos.has(qid) || !punto || !esLugarVisitable(tipos)) continue;
    vistos.add(qid);
    const url = fila.articulo.value;
    lugares.push({
      qid,
      nombre: mayusculaInicial(fila.itemLabel.value),
      titulo: decodeURIComponent(url.split('/wiki/')[1]!).replaceAll('_', ' '),
      url,
      lat: Number(punto[2]),
      lon: Number(punto[1]),
      enlaces: Number(fila.enlaces.value),
      tipos,
    });
  }
  return lugares;
}

/** Consulta SPARQL: lugares con artículo en español y en al menos 3 Wikipedias, a `radioKm` del centro. */
export function consultaSparql([lat, lon]: [number, number], radioKm: number): string {
  return `SELECT ?item ?itemLabel ?articulo ?coord ?enlaces (GROUP_CONCAT(DISTINCT ?tipoLabel; separator="|") AS ?tipos) WHERE {
  SERVICE wikibase:around { ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral . bd:serviceParam wikibase:radius "${radioKm}" . }
  ?articulo schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> .
  ?item wikibase:sitelinks ?enlaces .
  FILTER(?enlaces >= 3)
  OPTIONAL { ?item wdt:P31 ?tipo . ?tipo rdfs:label ?tipoLabel . FILTER(LANG(?tipoLabel) = "es") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es". ?item rdfs:label ?itemLabel . }
} GROUP BY ?item ?itemLabel ?articulo ?coord ?enlaces ORDER BY DESC(?enlaces)`;
}

/** El resumen del artículo, cortado en un final de frase para no pasar de `maximo` caracteres. */
export function recortarExtracto(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo);
  const fin = corte.lastIndexOf('. ');
  return fin > 0 ? corte.slice(0, fin + 1) : corte.trimEnd() + '…';
}

export function registroDeLugar(
  lugar: LugarWikidata,
  extracto: string,
  { destino, revision, fechaDescarga }: { destino: string; revision: number; fechaDescarga: string },
): Registro {
  const seccion = seccionDeTipos(lugar.tipos);
  // El nombre delante: la verificación y la postal buscan el lugar por su nombre en el texto.
  const documento = `${lugar.nombre}: ${extracto}`;
  return {
    id: `wikipedia:${destino}:${lugar.qid}`,
    documento,
    textoEmbedding: textoConContexto(destino, { seccion: seccion.split(' › '), texto: documento }),
    metadatos: {
      destino,
      fuente: 'Wikipedia',
      licencia: 'CC BY-SA 4.0',
      url: lugar.url,
      seccion,
      revision,
      fechaDescarga,
      lugar: lugar.nombre,
      wikidata: lugar.qid,
      lat: lugar.lat,
      lon: lugar.lon,
    },
  };
}
