// RF-03: ingesta de destinos del catálogo: descarga, limpieza, troceado, embeddings y guardado en Chroma
// (npm run ingesta -- Granada; sin argumentos indexa todos los destinos del catálogo).
import { cargarConfigChroma } from '../config/chroma.js';
import { buscarDestino, DESTINOS, type Destino } from '../config/destinos.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { abrirColeccion } from './chroma.js';
import { crearRegistros } from './registros.js';
import { TROCEADO_POR_DEFECTO, trocearArticulo } from './troceado.js';
import { descargarArticulo, urlArticulo } from './wikivoyage.js';
import { limpiarWikitexto } from './wikitexto.js';

const nombres = process.argv.slice(2);
const destinos: Destino[] = nombres.length
  ? nombres.map((nombre) => {
      const destino = buscarDestino(nombre);
      if (!destino) throw new Error(`«${nombre}» no está en el catálogo (src/config/destinos.ts)`);
      return destino;
    })
  : DESTINOS;

const configModelos = cargarConfigModelos();
const ai = crearAi(configModelos);
const coleccion = await abrirColeccion(cargarConfigChroma());

for (const destino of destinos) {
  console.log(`\n${destino.nombre}`);
  console.log(`  1. Descargando «${destino.articulo}» de Wikivoyage…`);
  const articulo = await descargarArticulo(destino.articulo);

  console.log(`  2. Limpiando y troceando (revisión ${articulo.revision})…`);
  const fragmentos = trocearArticulo(limpiarWikitexto(articulo.wikitexto), TROCEADO_POR_DEFECTO);
  const registros = crearRegistros(
    {
      destino: destino.nombre,
      url: urlArticulo(articulo.titulo),
      revision: articulo.revision,
      fechaDescarga: new Date().toISOString().slice(0, 10),
    },
    fragmentos,
  );

  console.log(`  3. Calculando ${registros.length} embeddings con ${configModelos.embedder}…`);
  const vectores = await ai.embedMany({
    embedder: `ollama/${configModelos.embedder}`,
    content: registros.map((r) => r.textoEmbedding),
  });

  console.log(`  4. Guardando en la colección «${coleccion.name}» de Chroma…`);
  // Si el artículo tiene ahora menos fragmentos que antes, los sobrantes no deben quedarse.
  await coleccion.delete({ where: { destino: destino.nombre } });
  await coleccion.upsert({
    ids: registros.map((r) => r.id),
    documents: registros.map((r) => r.documento),
    embeddings: vectores.map((v) => v.embedding),
    metadatas: registros.map((r) => r.metadatos),
  });
}

console.log(`\nHecho: la colección tiene ${await coleccion.count()} fragmentos en total.`);
