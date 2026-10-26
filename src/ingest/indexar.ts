// RF-03: ingesta de un destino: descarga, limpieza, troceado, embeddings y guardado en Chroma
// (npm run ingesta -- Sevilla).
import { cargarConfigChroma } from '../config/chroma.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { abrirColeccion } from './chroma.js';
import { crearRegistros } from './registros.js';
import { TROCEADO_POR_DEFECTO, trocearArticulo } from './troceado.js';
import { descargarArticulo, urlArticulo } from './wikivoyage.js';
import { limpiarWikitexto } from './wikitexto.js';

const destino = process.argv.slice(2).join(' ');
if (!destino) throw new Error('Indica el destino: npm run ingesta -- Sevilla');

const configModelos = cargarConfigModelos();
const ai = crearAi(configModelos);
const coleccion = await abrirColeccion(cargarConfigChroma());

console.log(`1. Descargando «${destino}» de Wikivoyage…`);
const articulo = await descargarArticulo(destino);

console.log(`2. Limpiando y troceando (revisión ${articulo.revision})…`);
const fragmentos = trocearArticulo(limpiarWikitexto(articulo.wikitexto), TROCEADO_POR_DEFECTO);
const registros = crearRegistros(
  {
    destino: articulo.titulo,
    url: urlArticulo(articulo.titulo),
    revision: articulo.revision,
    fechaDescarga: new Date().toISOString().slice(0, 10),
  },
  fragmentos,
);

console.log(`3. Calculando ${registros.length} embeddings con ${configModelos.embedder}…`);
const vectores = await ai.embedMany({
  embedder: `ollama/${configModelos.embedder}`,
  content: registros.map((r) => r.textoEmbedding),
});

console.log(`4. Guardando en la colección «${coleccion.name}» de Chroma…`);
// Si el artículo tiene ahora menos fragmentos que antes, los sobrantes no deben quedarse.
await coleccion.delete({ where: { destino: articulo.titulo } });
await coleccion.upsert({
  ids: registros.map((r) => r.id),
  documents: registros.map((r) => r.documento),
  embeddings: vectores.map((v) => v.embedding),
  metadatas: registros.map((r) => r.metadatos),
});

console.log(`Hecho: la colección tiene ${await coleccion.count()} fragmentos en total.`);
