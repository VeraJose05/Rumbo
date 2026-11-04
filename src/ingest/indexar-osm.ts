// RF-03, RF-14: ingesta de restaurantes, bares y ocio nocturno de OpenStreetMap
// (npm run ingesta:osm [-- Sevilla]). Por cada destino: locales de Overpass → los de datos más
// completos por tipo → ficha → embedding → Chroma (solo se sustituyen los de OpenStreetMap de ese
// destino) y coordenadas para el mapa (web/public/datos/coordenadas.json, origen «osm-local»).
// Datos © colaboradores de OpenStreetMap (ODbL): la web lo cita.
import { readFile, writeFile } from 'node:fs/promises';
import { cargarConfigChroma } from '../config/chroma.js';
import { buscarDestino, DESTINOS, type Destino } from '../config/destinos.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { abrirColeccion } from './chroma.js';
import { consultaOverpass, coordenadasDe, elegirLocales, registroDeLocal, seccionDeLocal, type ElementoOsm } from './osm.js';

const AGENTE = { 'User-Agent': 'Rumbo-TFM/0.1 (https://github.com/VeraJose05/Rumbo)' };
// Servidores públicos de Overpass: si uno está saturado (502, 504, 429), se prueba el siguiente.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const COORDENADAS = 'web/public/datos/coordenadas.json';
/** El centro de la ciudad, donde se mueve el viajero: unos 3,5 km a la redonda. */
const RADIO_M = 3500;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function localesDe(centro: [number, number]): Promise<ElementoOsm[]> {
  const errores: string[] = [];
  for (let intento = 0; intento < 2 * OVERPASS.length; intento++) {
    const servidor = OVERPASS[intento % OVERPASS.length]!;
    try {
      const respuesta = await fetch(servidor, {
        method: 'POST',
        headers: { ...AGENTE, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: consultaOverpass(centro, RADIO_M) }),
      });
      if (respuesta.ok) return ((await respuesta.json()) as { elements: ElementoOsm[] }).elements.filter((e) => e.tags);
      errores.push(`${new URL(servidor).host} ${respuesta.status}`);
    } catch (e) {
      errores.push(`${new URL(servidor).host} ${(e as Error).message}`);
    }
    await esperar(15_000);
  }
  throw new Error(`Overpass no responde: ${errores.join('; ')}`);
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
  const todos = await localesDe(datosDestino.centro);
  const elegidos = elegirLocales(todos);
  const cuenta = new Map<string, number>();
  for (const e of elegidos) cuenta.set(e.tags.amenity!, (cuenta.get(e.tags.amenity!) ?? 0) + 1);
  const porTipo = [...cuenta].map(([tipo, n]) => `${tipo} ${n}`).join(', ');
  console.log(`  1. ${todos.length} locales en OpenStreetMap; elegidos ${elegidos.length} (${porTipo})`);
  const registros = elegidos.map((e) => registroDeLocal(e, { destino: destino.nombre, fechaDescarga }));

  console.log(`  2. Calculando ${registros.length} embeddings con ${configModelos.embedder}…`);
  const vectores = await ai.embedMany({ embedder: `ollama/${configModelos.embedder}`, content: registros.map((r) => r.textoEmbedding) });

  console.log(`  3. Guardando en Chroma (solo los de OpenStreetMap de ${destino.nombre})…`);
  await coleccion.delete({ where: { $and: [{ destino: destino.nombre }, { fuente: 'OpenStreetMap' }] } });
  await coleccion.upsert({
    ids: registros.map((r) => r.id),
    documents: registros.map((r) => r.documento),
    embeddings: vectores.map((v) => v.embedding),
    metadatas: registros.map((r) => r.metadatos),
  });

  datosDestino.lugares = [
    ...datosDestino.lugares.filter((l) => l.origen !== 'osm-local'),
    ...elegidos.map((e) => ({ nombre: e.tags.name!, seccion: seccionDeLocal(e.tags), ...coordenadasDe(e), origen: 'osm-local' })),
  ];
  await writeFile(COORDENADAS, JSON.stringify(coordenadas, null, 1));
  // Overpass es un servicio compartido: una ciudad cada pocos segundos.
  await esperar(5000);
}

console.log(`\nHecho: la colección tiene ${await coleccion.count()} fragmentos en total.`);
