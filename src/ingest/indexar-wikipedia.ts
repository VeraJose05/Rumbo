// RF-03, RF-14: ingesta de la segunda fuente (npm run ingesta:wikipedia [-- Sevilla]). Por cada
// destino: lugares visitables de Wikidata con artículo en la Wikipedia en español → resumen del
// artículo → embedding → Chroma (solo se sustituyen los fragmentos de Wikipedia de ese destino) y
// coordenadas para el mapa (web/public/datos/coordenadas.json, origen «wikidata»).
import { readFile, writeFile } from 'node:fs/promises';
import { cargarConfigChroma } from '../config/chroma.js';
import { buscarDestino, DESTINOS, type Destino } from '../config/destinos.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { abrirColeccion } from './chroma.js';
import { consultaSparql, lugaresDeSparql, recortarExtracto, registroDeLugar, seccionDeTipos, type LugarWikidata } from './wikidata.js';

const AGENTE = { 'User-Agent': 'Rumbo-TFM/0.1 (https://github.com/VeraJose05/Rumbo)' };
const COORDENADAS = 'web/public/datos/coordenadas.json';
const RADIO_KM = 8;
/** Los más conocidos de cada ciudad (por número de Wikipedias): bastan y la ingesta no se alarga. */
const MAX_LUGARES = 250;
const MAX_EXTRACTO = 900;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lugaresDe(centro: [number, number]): Promise<LugarWikidata[]> {
  const respuesta = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { ...AGENTE, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: consultaSparql(centro, RADIO_KM) }),
  });
  if (!respuesta.ok) throw new Error(`Wikidata respondió ${respuesta.status}`);
  const datos = (await respuesta.json()) as { results: { bindings: Parameters<typeof lugaresDeSparql>[0] } };
  return lugaresDeSparql(datos.results.bindings).slice(0, MAX_LUGARES);
}

/** Resumen (introducción en texto plano) y revisión de cada artículo, por título; de 20 en 20. */
async function resumenes(titulos: string[]): Promise<Map<string, { extracto: string; revision: number }>> {
  const resultado = new Map<string, { extracto: string; revision: number }>();
  for (let i = 0; i < titulos.length; i += 20) {
    const lote = titulos.slice(i, i + 20);
    const url = new URL('https://es.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', prop: 'extracts|info',
      exintro: '1', explaintext: '1', redirects: '1', titles: lote.join('|'),
    }).toString();
    const datos = (await (await fetch(url, { headers: AGENTE })).json()) as {
      query: {
        pages: { title: string; extract?: string; lastrevid?: number }[];
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
      };
    };
    // El título pedido puede volver normalizado o tras una redirección: se deshace el camino.
    const destinoDe = (t: string) => {
      const normal = datos.query.normalized?.find((n) => n.from === t)?.to ?? t;
      return datos.query.redirects?.find((r) => r.from === normal)?.to ?? normal;
    };
    for (const titulo of lote) {
      const pagina = datos.query.pages.find((p) => p.title === destinoDe(titulo));
      if (pagina?.extract?.trim()) resultado.set(titulo, { extracto: recortarExtracto(pagina.extract, MAX_EXTRACTO), revision: pagina.lastrevid ?? 0 });
    }
    await esperar(300);
  }
  return resultado;
}

const nombres = process.argv.slice(2);
const destinos: Destino[] = nombres.length
  ? nombres.map((n) => buscarDestino(n) ?? (() => { throw new Error(`«${n}» no está en el catálogo`); })())
  : DESTINOS;

const configModelos = cargarConfigModelos();
const ai = crearAi(configModelos);
const coleccion = await abrirColeccion(cargarConfigChroma());
const coordenadas = JSON.parse(await readFile(COORDENADAS, 'utf8')) as {
  destinos: Record<string, { centro: [number, number]; lugares: { nombre: string; seccion: string; lat: number; lon: number; origen?: string }[] }>;
};
const fechaDescarga = new Date().toISOString().slice(0, 10);

for (const destino of destinos) {
  const datosDestino = coordenadas.destinos[destino.nombre];
  if (!datosDestino) throw new Error(`Falta el centro de ${destino.nombre} en ${COORDENADAS} (npm run coordenadas)`);
  console.log(`\n${destino.nombre}`);
  const lugares = await lugaresDe(datosDestino.centro);
  console.log(`  1. ${lugares.length} lugares visitables en Wikidata`);
  const textos = await resumenes(lugares.map((l) => l.titulo));
  const conTexto = lugares.filter((l) => textos.has(l.titulo));
  console.log(`  2. ${conTexto.length} con resumen en la Wikipedia en español`);
  const registros = conTexto.map((l) => registroDeLugar(l, textos.get(l.titulo)!.extracto, { destino: destino.nombre, revision: textos.get(l.titulo)!.revision, fechaDescarga }));

  console.log(`  3. Calculando ${registros.length} embeddings con ${configModelos.embedder}…`);
  const vectores = await ai.embedMany({ embedder: `ollama/${configModelos.embedder}`, content: registros.map((r) => r.textoEmbedding) });

  console.log(`  4. Guardando en Chroma (solo los fragmentos de Wikipedia de ${destino.nombre})…`);
  await coleccion.delete({ where: { $and: [{ destino: destino.nombre }, { fuente: 'Wikipedia' }] } });
  await coleccion.upsert({
    ids: registros.map((r) => r.id),
    documents: registros.map((r) => r.documento),
    embeddings: vectores.map((v) => v.embedding),
    metadatas: registros.map((r) => r.metadatos),
  });

  // Coordenadas para el mapa: las de Wikidata sustituyen a las anteriores de esta fuente.
  datosDestino.lugares = [
    ...datosDestino.lugares.filter((l) => l.origen !== 'wikidata'),
    ...conTexto.map((l) => ({ nombre: l.nombre, seccion: seccionDeTipos(l.tipos), lat: l.lat, lon: l.lon, origen: 'wikidata' })),
  ];
  await writeFile(COORDENADAS, JSON.stringify(coordenadas, null, 1));
  await esperar(1000);
}

console.log(`\nHecho: la colección tiene ${await coleccion.count()} fragmentos en total.`);
