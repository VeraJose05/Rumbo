// RF-03: descarga de artículos de Wikivoyage en español mediante la API de MediaWiki.

const API = 'https://es.wikivoyage.org/w/api.php';
// Wikimedia pide identificar a los clientes de su API.
const AGENTE = 'Rumbo-TFM/0.1 (planificador turístico académico)';

export interface ArticuloWikivoyage {
  titulo: string;
  revision: number;
  wikitexto: string;
}

export function urlArticulo(titulo: string): string {
  return `https://es.wikivoyage.org/wiki/${encodeURIComponent(titulo.replaceAll(' ', '_'))}`;
}

export async function descargarArticulo(titulo: string): Promise<ArticuloWikivoyage> {
  const parametros = new URLSearchParams({
    action: 'parse',
    page: titulo,
    prop: 'wikitext|revid',
    redirects: '1',
    format: 'json',
    formatversion: '2',
  });
  const respuesta = await fetch(`${API}?${parametros}`, { headers: { 'User-Agent': AGENTE } });
  if (!respuesta.ok) throw new Error(`Wikivoyage respondió ${respuesta.status} al pedir «${titulo}»`);
  return leerRespuestaParse((await respuesta.json()) as RespuestaParse);
}

interface RespuestaParse {
  parse?: { title: string; revid: number; wikitext: string };
  error?: { code: string; info: string };
}

export function leerRespuestaParse(respuesta: RespuestaParse): ArticuloWikivoyage {
  if (!respuesta.parse) {
    throw new Error(`Error de la API de Wikivoyage: ${respuesta.error?.code} (${respuesta.error?.info})`);
  }
  const { title, revid, wikitext } = respuesta.parse;
  return { titulo: title, revision: revid, wikitexto: wikitext };
}
